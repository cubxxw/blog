#!/usr/bin/env bash
set -euo pipefail

# Use GitHub's official immutable asset API after repeated release-URL 504s.
# The original Hugo version and extended build remain pinned; a download error,
# wrong platform, changed archive or wrong executable is still a hard failure.
: "${RUNNER_TEMP:?GitHub runner temporary directory is required}"
: "${GITHUB_PATH:?GitHub path output is required}"
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || {
  echo 'The pinned Hugo installer requires Linux amd64.' >&2
  exit 1
}
mapfile -t pinned < <(node -e '
  const c = require("./config/ci-toolchain.json"), a = c.hugoExtendedLinuxAmd64;
  if (!/^\d+\.\d+\.\d+$/.test(c.hugo) || c.hugoExtended !== true ||
      !a || !Number.isSafeInteger(a.assetId) || a.assetId <= 0 ||
      !Number.isSafeInteger(a.archiveBytes) || a.archiveBytes <= 0 || a.archiveBytes > 32 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(a.sha256)) process.exit(1);
  for (const value of [c.hugo, a.assetId, a.archiveBytes, a.sha256]) console.log(value);
')
[[ ${#pinned[@]} -eq 4 ]] || { echo 'Invalid Hugo asset binding.' >&2; exit 1; }
version=${pinned[0]}
asset_id=${pinned[1]}
archive_bytes=${pinned[2]}
archive_sha=${pinned[3]}
tool_dir=$(mktemp -d "$RUNNER_TEMP/blog-hugo.XXXXXX")
archive="$tool_dir/hugo.tar.gz"
trap 'rm -f -- "$archive"' EXIT

downloaded=false
for attempt in 1 2; do
  # head bounds bytes written even if the remote endpoint sends excess data.
  if timeout 60s gh api "/repos/gohugoio/hugo/releases/assets/$asset_id" \
      --header 'Accept: application/octet-stream' \
      | head -c "$((archive_bytes + 1))" > "$archive"; then
    downloaded=true
    break
  fi
done
[[ "$downloaded" == true ]] || { echo 'Official Hugo asset download failed.' >&2; exit 1; }
[[ "$(wc -c < "$archive")" -eq "$archive_bytes" ]] || { echo 'Hugo archive size mismatch.' >&2; exit 1; }
printf '%s  %s\n' "$archive_sha" "$archive" | sha256sum --check --status
[[ "$(tar -tzf "$archive" -- hugo)" == hugo ]] || { echo 'Hugo archive member mismatch.' >&2; exit 1; }
[[ "$(tar -tvzf "$archive" -- hugo)" == -* ]] || { echo 'Hugo archive executable is not regular.' >&2; exit 1; }
tar -xzf "$archive" -C "$tool_dir" --no-same-owner --no-same-permissions -- hugo
chmod 0755 "$tool_dir/hugo"
installed_version=$("$tool_dir/hugo" version)
[[ "$installed_version" == "hugo v$version"-*+extended\ linux/amd64* ]] || {
  echo 'The installed Hugo version or extended platform does not match.' >&2
  exit 1
}
printf '%s\n' "$installed_version"
printf '%s\n' "$tool_dir" >> "$GITHUB_PATH"
