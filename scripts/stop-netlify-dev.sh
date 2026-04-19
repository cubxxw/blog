#!/usr/bin/env bash

set -euo pipefail

HUGO_PORT="${HUGO_DEV_PORT:-1313}"
NETLIFY_PORT="${NETLIFY_DEV_PORT:-8888}"

kill_port() {
  local port="$1"
  local pids

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    echo "Port $port is already free."
    return
  fi

  echo "Stopping listeners on port $port: $pids"
  kill $pids 2>/dev/null || true
}

kill_pattern() {
  local pattern="$1"
  if pkill -f "$pattern" 2>/dev/null; then
    echo "Stopped processes matching: $pattern"
  fi
}

kill_port "$HUGO_PORT"
kill_port "$NETLIFY_PORT"

kill_pattern "netlify dev"
kill_pattern "hugo server --environment development"

sleep 1

leftovers=()
for port in "$HUGO_PORT" "$NETLIFY_PORT"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    leftovers+=("$port")
  fi
done

if [[ ${#leftovers[@]} -gt 0 ]]; then
  echo "Ports still busy: ${leftovers[*]}" >&2
  exit 1
fi

echo "Netlify/Hugo dev ports are clear."
