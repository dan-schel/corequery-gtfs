#!/usr/bin/env bash

set -euo pipefail

current="$(node -p "require('./package.json').version")"
previous="$(git show "$1:package.json" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version")"
[[ "$current" != "$previous" ]] && echo "true" || echo "false"
