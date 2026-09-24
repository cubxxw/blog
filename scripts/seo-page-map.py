#!/usr/bin/env python3
"""Trusted page-map preparation for the SEO autofix gate (issue #392 / B2).

Converts the pinned Hugo `hugo list published` CSV (stdlib csv) into the frozen
``seo-page-map/1`` JSON that B1 validates and consumes. This is a lightweight
trusted handoff — never model authority and never a full site build:

* ``sourceCommit`` comes from ``git rev-parse HEAD`` in the frozen checkout and
  must match the caller's expected SHA; the tree must be clean.
* Every listed source path is proven to be a TRACKED ordinary Markdown file
  with the EXACT Git case (index match, regular mode 100644/100755), no symlink
  components and a realpath inside the repository. Failed rows are excluded and
  recorded — never silently dropped, never a complete empty map.
* Hugo's no-date sentinel becomes ``publishDate: null``; other dates convert to
  strict UTC. Conflicts/ambiguity stay for B1's isolating validator.
* A failed or partial read NEVER becomes a complete empty map (exit 2).

Usage:
  python3 scripts/seo-page-map.py --csv page-map.csv --out page-map.json \
    --repository cubxxw/blog --source-commit <40-hex> --clock <UTC> \
    [--repo-root .] [--max-rows 5000]
"""

import argparse
import csv
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

SCHEMA = "seo-page-map/1"
PRODUCER = {
    "name": "hugo-list-published",
    "version": "0.145.0",
    "environment": "production",
    "baseURL": "https://cubxxw.com/",
}
REQUIRED_COLUMNS = ["path", "permalink", "kind", "publishDate"]
HEX40 = re.compile(r"^[0-9a-f]{40}$")
UTC_STAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$")
REPO_NAME = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
MAX_CSV_BYTES = 16 * 1024 * 1024


def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def convert_publish_date(raw):
    """Hugo publishDate -> strict UTC timestamp or null (no-date sentinel)."""
    if raw is None:
        return None, "publishDate missing"
    value = raw.strip()
    if value == "":
        return None, None  # Hugo no-date sentinel for undated content
    if value.startswith("0001-01-01"):
        return None, None  # explicit Hugo no-date sentinel, never a fake time
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None, f"publishDate not parseable"
    if dt.tzinfo is None:
        return None, "publishDate has no timezone"
    dt = dt.astimezone(timezone.utc)
    stamp = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    if dt.microsecond:
        stamp = dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:23] + "Z"
    return stamp, None


def path_shape_ok(rel):
    if not isinstance(rel, str) or rel == "" or len(rel) > 512:
        return False
    if "\\" in rel or rel.startswith("/"):
        return False
    parts = rel.split("/")
    if any(p in ("", ".", "..") for p in parts):
        return False
    if len(parts) < 3 or parts[0] != "content" or parts[1] not in ("en", "zh"):
        return False
    return rel.endswith(".md")


def git_lines(args, cwd):
    out = subprocess.run(["git", "-C", cwd] + args, capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {out.stderr.strip()[:200]}")
    return out.stdout


def tracked_index(repo_root):
    """path -> mode from the Git index (exact recorded case)."""
    raw = git_lines(["ls-files", "--stage", "-z"], repo_root)
    index = {}
    for entry in raw.split("\0"):
        if not entry:
            continue
        meta, _, path = entry.partition("\t")
        mode = meta.split()[0] if meta else ""
        index[path] = mode
    return index


def file_proof(rel, repo_root, index):
    """Tracked ordinary Markdown, exact Git case, no symlinks, realpath inside."""
    mode = index.get(rel)
    if mode is None:
        return "source-not-tracked-exact-case: path is not in the Git index with this exact case"
    if mode not in ("100644", "100755"):
        return "source-not-ordinary-file: tracked mode is not a regular file (no symlinks/submodules)"
    full = os.path.join(repo_root, rel)
    root_real = os.path.realpath(repo_root)
    # no symlink component anywhere between the root and the file
    current = repo_root
    for part in rel.split("/"):
        current = os.path.join(current, part)
        if os.path.islink(current):
            return "source-symlink: symlink components are rejected"
    if not os.path.isfile(full):
        return "source-missing: tracked path has no physical file in the frozen checkout"
    real = os.path.realpath(full)
    if real != os.path.join(root_real, rel) and not real.startswith(root_real + os.sep):
        return "source-outside-repo: realpath escapes the repository"
    return None


def main(argv=None):
    parser = argparse.ArgumentParser(description="Hugo published-list CSV -> seo-page-map/1 (trusted prep)")
    parser.add_argument("--csv", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--source-commit", required=True, dest="source_commit")
    parser.add_argument("--clock", required=True)
    parser.add_argument("--repo-root", default=".", dest="repo_root")
    parser.add_argument("--max-rows", type=int, default=5000, dest="max_rows")
    args = parser.parse_args(argv)

    problems = []
    if not REPO_NAME.match(args.repository):
        problems.append("repository identity invalid")
    if not HEX40.match(args.source_commit or ""):
        problems.append("sourceCommit must be 40-hex")
    if not UTC_STAMP.match(args.clock or ""):
        problems.append("clock must be a strict UTC timestamp")
    if problems:
        write_map(args.out, args, [], "failed", "truncated", problems, None)
        return 2

    # Frozen clean checkout proof: no staged/unstaged changes to TRACKED files
    # (untracked helper outputs like the CSV itself live in the checkout and are
    # irrelevant — every mapped source is separately proven tracked below, so
    # untracked content can never enter the map).
    try:
        head = git_lines(["rev-parse", "HEAD"], args.repo_root).strip()
        status = git_lines(["status", "--porcelain", "--untracked-files=no"], args.repo_root)
        index = tracked_index(args.repo_root)
    except (RuntimeError, OSError) as err:
        write_map(args.out, args, [], "failed", "truncated", [f"git-read-failed: {str(err)[:200]}"], None)
        return 2
    if head != args.source_commit:
        write_map(args.out, args, [], "failed", "truncated",
                  ["source-commit-mismatch: checkout HEAD is not the expected frozen SHA"], head)
        return 2
    if status.strip() != "":
        write_map(args.out, args, [], "failed", "truncated",
                  ["checkout-not-clean: uncommitted changes to tracked files make the listing unprovable"], head)
        return 2

    # Bounded CSV read with the stdlib converter (quoted commas/newlines safe).
    try:
        if os.path.getsize(args.csv) > MAX_CSV_BYTES:
            write_map(args.out, args, [], "failed", "truncated", ["csv-too-large: bounded input exceeded"], head)
            return 2
        with open(args.csv, newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            missing = [c for c in REQUIRED_COLUMNS if c not in (reader.fieldnames or [])]
            if missing:
                write_map(args.out, args, [], "failed", "truncated",
                          ["csv-missing-required-columns"], head)
                return 2
            rows = []
            excluded = []
            truncated = False
            for i, row in enumerate(reader):
                if len(rows) + len(excluded) >= args.max_rows:
                    truncated = True  # visible, never silent
                    break
                entry, problem = convert_row(row, i, args.repo_root, index)
                if entry is None:
                    excluded.append(problem)
                else:
                    rows.append(entry)
    except (OSError, csv.Error, UnicodeDecodeError) as err:
        write_map(args.out, args, [], "failed", "truncated", [f"csv-read-failed: {str(err)[:200]}"], head)
        return 2

    completeness = "truncated" if truncated else "complete"
    status_out = "ok" if rows else "failed"
    notes = excluded[:100]
    if truncated:
        notes.append("row cap reached: enumeration marked truncated, never silently cut")
    write_map(args.out, args, rows, status_out, completeness, notes, head)
    return 0 if rows and not truncated else 2


def convert_row(row, i, repo_root, index):
    rel = row.get("path")
    url = row.get("permalink")
    kind = row.get("kind")
    where = f"page row {i}"
    if not path_shape_ok(rel):
        return None, f"{where}: source path shape rejected"
    if not isinstance(url, str) or not url.startswith("https://cubxxw.com") or len(url) > 2048:
        return None, f"{where}: permalink is not an owned production URL"
    if not isinstance(kind, str) or kind == "" or len(kind) > 32:
        return None, f"{where}: kind missing"
    publish_date, problem = convert_publish_date(row.get("publishDate"))
    if problem:
        return None, f"{where}: {problem}"
    proof = file_proof(rel, repo_root, index)
    if proof:
        return None, f"{where}: {proof}"
    return {"url": url, "sourcePath": rel, "kind": kind, "publishDate": publish_date}, None


def write_map(out, args, pages, read_status, completeness, notes, head):
    payload = {
        "schema": SCHEMA,
        "repository": args.repository,
        "sourceCommit": head if head else args.source_commit,
        "clock": args.clock,
        "generatedAt": utc_now(),
        "producer": PRODUCER,
        "read": {"status": read_status, "completeness": completeness, "notes": list(notes)[:200]},
        "pages": pages,
    }
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    sys.exit(main())
