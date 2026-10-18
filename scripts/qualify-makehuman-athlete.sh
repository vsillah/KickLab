#!/bin/sh
set -eu

# Headless, clean-profile qualification for the Direction C MakeHuman athlete.
# Optional inputs avoid re-downloading already verified archives:
#   KICKLAB_MPFB_ARCHIVE=/path/to/add-on-mpfb-v2.0.18.zip
#   KICKLAB_SYSTEM_ASSETS_ARCHIVE=/path/to/makehuman_system_assets_cc0.zip
# Optional browser-QA controls:
#   KICKLAB_QA_PORT=4219
#   KICKLAB_QA_OUTPUT=qa-artifacts/makehuman-athlete/runtime

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
run_root=$(mktemp -d "${TMPDIR:-/tmp}/kicklab-makehuman-qualification.XXXXXX")
server_pid=""

cleanup() {
  if [ -n "$server_pid" ]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf -- "$run_root"
}
trap cleanup EXIT INT TERM

need() {
  command -v "$1" >/dev/null 2>&1 || {
    printf '%s\n' "Missing required command: $1" >&2
    exit 1
  }
}

for command_name in blender curl unzip shasum npm node python3 ffmpeg; do
  need "$command_name"
done

mpfb_url='https://extensions.blender.org/download/sha256:c075b3e9b94b8e5556a5f03f4653602d02ea306de08126e8f55ed6dee28a2dad/add-on-mpfb-v2.0.18.zip'
system_assets_url='https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip'
mpfb_sha='c075b3e9b94b8e5556a5f03f4653602d02ea306de08126e8f55ed6dee28a2dad'
system_assets_sha='b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107'
mpfb_archive=${KICKLAB_MPFB_ARCHIVE:-"$run_root/add-on-mpfb-v2.0.18.zip"}
system_assets_archive=${KICKLAB_SYSTEM_ASSETS_ARCHIVE:-"$run_root/makehuman_system_assets_cc0.zip"}

if [ ! -f "$mpfb_archive" ]; then
  curl --fail --location --proto '=https' --tlsv1.2 --output "$mpfb_archive" "$mpfb_url"
fi
if [ ! -f "$system_assets_archive" ]; then
  curl --fail --location --proto '=https' --tlsv1.2 --output "$system_assets_archive" "$system_assets_url"
fi

printf '%s  %s\n' "$mpfb_sha" "$mpfb_archive" | shasum -a 256 -c -
printf '%s  %s\n' "$system_assets_sha" "$system_assets_archive" | shasum -a 256 -c -

core_assets="$run_root/core-assets"
mkdir -p "$core_assets"
unzip -q "$system_assets_archive" \
  'skins/young_african_male/*' \
  'clothes/female_sportsuit01/*' \
  'clothes/shoes04/*' \
  'hair/short04/*' \
  'eyes/low-poly/*' \
  'eyes/materials/brown.*' \
  -d "$core_assets"

export BLENDER_USER_CONFIG="$run_root/blender/config"
export BLENDER_USER_SCRIPTS="$run_root/blender/scripts"
export BLENDER_USER_EXTENSIONS="$run_root/blender/extensions"
export BLENDER_USER_DATAFILES="$run_root/blender/datafiles"
export KICKLAB_MAKEHUMAN_CORE_ASSETS="$core_assets"
mkdir -p "$BLENDER_USER_CONFIG" "$BLENDER_USER_SCRIPTS" "$BLENDER_USER_EXTENSIONS" "$BLENDER_USER_DATAFILES"

blender -c extension install-file -r user_default -e "$mpfb_archive"
blender --background --python "$repo_root/scripts/generate-makehuman-athlete.py"

cd "$repo_root"
npm run assets:validate
node --test tests/direction-c-athlete.test.mjs
npm run build

qa_port=${KICKLAB_QA_PORT:-4219}
qa_output=${KICKLAB_QA_OUTPUT:-qa-artifacts/makehuman-athlete/runtime}
python3 -m http.server "$qa_port" --bind 127.0.0.1 --directory dist >"$run_root/http.log" 2>&1 &
server_pid=$!
attempt=0
until curl --fail --silent --output /dev/null "http://127.0.0.1:$qa_port/kicklab.html"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 50 ]; then
    printf '%s\n' "Local QA server did not become ready; log follows:" >&2
    sed -n '1,120p' "$run_root/http.log" >&2
    exit 1
  fi
  sleep 0.1
done

node scripts/qa-direction-c-athlete.mjs "http://127.0.0.1:$qa_port/kicklab.html" "$qa_output"
git diff --check
printf '%s\n' "Headless qualification passed. Evidence: $repo_root/$qa_output"
