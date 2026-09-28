#!/usr/bin/env python3
"""Parse Hugo's quoted CSV with the stdlib; never infer permalinks from Markdown paths.

The Node consumer verifies physical source/output boundaries and enumerates outputs.
This transport deliberately does not alter the frozen SEO page-map schema.
"""
import argparse
import csv
import json
import os
import sys
from urllib.parse import unquote, urlsplit


def convert(filename, base_url):
    if os.path.getsize(filename) > 16 * 1024 * 1024:
        raise ValueError('CSV exceeds 16 MiB')
    base = urlsplit(base_url)
    if base.scheme not in ('http', 'https') or not base.netloc or base.query or base.fragment:
        raise ValueError('Invalid base URL')
    rows = []
    seen = set()
    with open(filename, encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle, strict=True)
        if not {'path', 'permalink', 'kind'}.issubset(reader.fieldnames or []):
            raise ValueError('CSV missing path, permalink or kind')
        for row in reader:
            if len(rows) >= 10000:
                raise ValueError('CSV exceeds 10000 rows')
            source = row.get('path', '')
            parts = source.split('/')
            if len(parts) < 3 or parts[0] != 'content' or parts[1] not in ('en', 'zh') or any(p in ('', '.', '..') for p in parts) or '\\' in source or not source.endswith('.md'):
                raise ValueError('Invalid source path in CSV: ' + source)
            url = row.get('permalink', '')
            parsed = urlsplit(url)
            decoded = unquote(parsed.path)
            if parsed.scheme != base.scheme or parsed.netloc != base.netloc or not parsed.path.startswith(base.path.rstrip('/') + '/') or parsed.query or parsed.fragment or '\\' in decoded or any(p in ('.', '..') for p in decoded.split('/')) or '%2e' in decoded.lower() or '%2f' in decoded.lower():
                raise ValueError('Invalid permalink in CSV: ' + url)
            if not row.get('kind') or (source, url) in seen:
                raise ValueError('Duplicate or incomplete CSV row')
            seen.add((source, url))
            rows.append({'source': source, 'url': url, 'kind': row['kind'], 'lang': parts[1]})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv', required=True)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--out')
    args = parser.parse_args()
    try:
        rows = convert(args.csv, args.base_url)
        rendered = json.dumps(rows, ensure_ascii=False) + '\n'
        if args.out:
            with open(args.out, 'w', encoding='utf-8') as handle:
                handle.write(rendered)
        else:
            sys.stdout.write(rendered)
        return 0
    except (OSError, ValueError, csv.Error) as exc:
        print('Hugo CSV conversion failed: ' + str(exc), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
