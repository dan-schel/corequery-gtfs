#!/usr/bin/env bash

set -euo pipefail

before="$1"

if [[ "$before" == "0000000000000000000000000000000000000000" ]]; then
  echo "changed=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

current="$(node -p "require('./package.json').version")"
previous="$(git show "${before}:package.json" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version")"
[[ "$current" != "$previous" ]] && echo "changed=true" >> "$GITHUB_OUTPUT" || echo "changed=false" >> "$GITHUB_OUTPUT"
