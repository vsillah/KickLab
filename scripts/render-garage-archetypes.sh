#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
render_root="$repo_root/qa-artifacts/garage-archetypes/rendered"
asset_root="$repo_root/src/assets/garage/v1"
mkdir -p "$render_root" "$asset_root"

cd "$repo_root"
blender -b --python scripts/garage-archetypes/render.py -- --out "$render_root"
for name in kart street race; do
  cwebp -quiet -q 82 -alpha_q 92 -m 6 "$render_root/$name.png" -o "$asset_root/$name.webp"
done
printf 'Garage archetypes: %s\n' "$asset_root"
wc -c "$asset_root"/*.webp
