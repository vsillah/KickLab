#!/usr/bin/env python3
"""Generate or verify the exact-file H11 capture evidence schedule; never change media."""
import csv
import hashlib
import io
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RELEASE = ROOT / 'docs/release'
SCHEDULE = RELEASE / 'phase2-h11-capture-evidence.csv'
FIELDS = (
    'mobile_path', 'sha256', 'bytes', 'source_manifest', 'manifest_sha256',
    'capture_script', 'visible_consumer', 'media_role', 'mode_or_lab', 'vehicle',
    'capture_revision_evidence', 'model_path', 'model_sha256',
    'upstream_rights_status', 'capture_identity_evidence',
    'remaining_capture_evidence', 'recommended_current_route',
    'conditional_recapture_trigger', 'cobalt_residual_risk',
)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def csv_rows(path):
    with path.open(newline='') as handle:
        return list(csv.DictReader(handle))

def git(*args):
    return subprocess.check_output(('git', *args), cwd=ROOT).decode().strip()

ledger = {row['mobile_path']: row for row in csv_rows(RELEASE / 'shipped-file-rights.csv')}
plan = {row['mobile_path']: row for row in csv_rows(RELEASE / 'runtime-rights-evidence-plan.csv')}
action = {row['mobile_path']: row for row in csv_rows(RELEASE / 'rights-action-map.csv')}
recapture = {row['media_path']: row for row in csv_rows(RELEASE / 'runtime-rights-recapture-map.csv')}
assert len(ledger) == len(action) == 204 and len(plan) == 203 and len(recapture) == 146
assert sum(row['release_disposition'].startswith('hold:') for row in ledger.values()) == 0
assert sum(row['review_state'].startswith('held') for row in plan.values()) == 0
assert sum(row['release_disposition'].startswith('internal clear:') for row in ledger.values()) == 204
for path in recapture:
    assert path in ledger and path in plan and path in action
    assert plan[path]['rights_group'] == action[path]['action_group'] == 'H11'
    assert ledger[path]['release_disposition'].startswith('internal clear: continued commercial preparation only')
    assert action[path]['current_disposition'].startswith('internal clear: continued commercial preparation only')
    assert plan[path]['review_state'].startswith('internal clear: continued commercial preparation only')
    media = ROOT / 'dist/mobile' / path
    assert media.stat().st_size == int(ledger[path]['bytes'])
    assert sha(media.read_bytes()) == ledger[path]['sha256']
    source = ROOT / 'src' / path
    assert source.stat().st_size == media.stat().st_size and sha(source.read_bytes()) == ledger[path]['sha256']

rows = []
race_introductions = Counter()
def add(path, manifest, role, mode, vehicle, revision, model, upstream, identity, gap, risk=''):
    item = ledger[path]
    rec = recapture[path]
    assert rec['source_manifest'] == manifest
    assert (ROOT / ('scripts/capture-home-preview-media.mjs' if manifest == 'src/media/home-previews/manifest.json' else 'scripts/generate-race-preflight-media.mjs')).is_file()
    assert rec['lab_surface'] == plan[path]['product_lab_consumer']
    assert path not in {row['mobile_path'] for row in rows}
    rows.append({
        'mobile_path': path,
        'sha256': item['sha256'],
        'bytes': item['bytes'],
        'source_manifest': manifest,
        'manifest_sha256': sha((ROOT / manifest).read_bytes()),
        'capture_script': ('scripts/capture-home-preview-media.mjs' if manifest == 'src/media/home-previews/manifest.json' else 'scripts/generate-race-preflight-media.mjs'),
        'visible_consumer': rec['lab_surface'],
        'media_role': role,
        'mode_or_lab': mode,
        'vehicle': vehicle,
        'capture_revision_evidence': revision,
        'model_path': model,
        'model_sha256': ledger[model]['sha256'] if model else '',
        'upstream_rights_status': upstream,
        'capture_identity_evidence': identity,
        'remaining_capture_evidence': gap,
        'recommended_current_route': 'additional_owner_evidence; unchanged reuse candidate only after capture inputs and rights are proven',
        'conditional_recapture_trigger': rec['recapture_trigger'],
        'cobalt_residual_risk': risk,
    })

race_manifests = (
    'manifest.json', 'arrival-manifest.json',
    'venue-manifest.json', 'venue-arrival-manifest.json',
)
for name in race_manifests:
    manifest = f'src/media/race-preflight/{name}'
    document = json.loads((ROOT / manifest).read_text())
    assert document['source'] == 'KickLab local Race 3D renderer'
    assert document['captureFlag'] == 'racePreflightCapture=1'
    for entry in document['entries']:
        model = entry['asset']
        assert ledger[model]['release_disposition'].startswith('internal clear:')
        assert plan[model]['rights_group'] == 'H03'
        assert entry['vehicle'] in ('aegis', 'cobalt', 'kestrel', 'sable', 'vesper')
        video, poster = entry['video'], entry['poster']
        assert entry['bytes'] == int(ledger[video]['bytes'])
        assert entry['sha256'] == ledger[video]['sha256']
        assert entry['posterSha256'] == ledger[poster]['sha256']
        intro = git('log', '--diff-filter=A', '--format=%H', '--', 'src/' + video).splitlines()
        assert len(intro) == 1
        race_introductions[intro[0]] += 2
        assert git('log', '--format=%H', '--', 'src/' + video).splitlines() == intro
        assert git('log', '--format=%H', '--', 'src/' + poster).splitlines() == intro
        source_model = subprocess.check_output(('git', 'show', f'{intro[0]}:src/{model}'), cwd=ROOT)
        assert sha(source_model) == ledger[model]['sha256']
        assert git('log', '--diff-filter=A', '--format=%H', '--', 'src/' + poster).splitlines() == intro
        kind = document['kind']
        mode = entry['mode']
        vehicle = entry['vehicle']
        common = 'Current exact H01 renderer and H03 vehicle model have limited preparation decisions; captured scene inputs remain unverified'
        gap = 'Exact capture source revision and complete frame-visible track/venue/lighting/effect/portrait/mark input and rights inventory; capture-level owner finding'
        risk = 'Carry accepted premium Cobalt model residual provenance risk into any capture decision' if vehicle == 'cobalt' else ''
        revision = f'Git media-introduction commit {intro[0]}; exact capture source revision absent from manifest'
        add(video, manifest, 'video', mode + '/' + kind, vehicle, revision, model, common,
            'Manifest video SHA-256 and bytes match shipped ledger; model SHA-256 at media-introduction commit matches current accepted model', gap, risk)
        poster_identity = 'Manifest poster SHA-256 matches shipped ledger'
        add(poster, manifest, 'poster', mode + '/' + kind, vehicle, revision, model, common,
            poster_identity + '; paired video manifest SHA-256 matches; model SHA-256 at media-introduction commit matches', gap, risk)

home_manifest = 'src/media/home-previews/manifest.json'
home = json.loads((ROOT / home_manifest).read_text())
assert home['privacy'] == 'local renderer only; no external requests; no audio'
for clip in home['clips']:
    lab, revision = clip['lab'], clip['revision']
    assert git('cat-file', '-t', revision) == 'commit'
    assert clip['bytes'] == int(ledger[clip['mp4']]['bytes'])
    assert clip['posterBytes'] == int(ledger[clip['poster']]['bytes'])
    assert clip['sha256'] == ledger[clip['mp4']]['sha256']
    assert clip['posterSha256'] == ledger[clip['poster']]['sha256']
    video_commit = git('log', '-1', '--format=%H', '--', 'src/' + clip['mp4'])
    assert video_commit == git('log', '-1', '--format=%H', '--', 'src/' + clip['poster'])
    assert subprocess.run(('git', 'merge-base', '--is-ancestor', revision, video_commit), cwd=ROOT).returncode == 0
    upstream = {
        'Fight': 'Current H01 HTML accepted for limited preparation; historical Canvas art and any generated inputs in frames unverified',
        'Kick': 'Current H01 and H09R athlete accepted for limited preparation; actual athlete and scene inputs at capture revision unverified',
        'Race': 'Current H01 and H03 models accepted for limited preparation; model identity and scene inputs in this Home clip unverified',
    }[lab]
    gap = 'Frame-visible source art/model/scene/effect/portrait/mark inventory at recorded revision; source capture runtime and poster derivation receipt; capture-level owner finding'
    identity = 'Manifest Git revision exists; MP4/poster SHA-256 and byte counts match shipped ledger'
    for role, path in (('video', clip['mp4']), ('poster', clip['poster'])):
        add(path, home_manifest, role, lab, '', f'Manifest capture revision {revision}', '', upstream, identity, gap)

assert len(rows) == 146 and set(row['mobile_path'] for row in rows) == set(recapture)
for row in rows:
    if row['media_role'] == 'video':
        probe = json.loads(subprocess.check_output(('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', str(ROOT / 'dist/mobile' / row['mobile_path']))))
        assert not any(stream['codec_type'] == 'audio' for stream in probe['streams']), row['mobile_path']
assert Counter(row['vehicle'] for row in rows) == {'': 6, 'aegis': 28, 'cobalt': 28, 'kestrel': 28, 'sable': 28, 'vesper': 28}
assert Counter(row['media_role'] for row in rows) == {'video': 73, 'poster': 73}
assert race_introductions == {
    'd8fe62a78572be11d21f5c2afbe3953068757c50': 60,
    '86877504645991e799ef1f6036c3c168bbaa74ee': 40,
    '0dcbeff4a6aa72cac2f10685560c8e32139660e6': 40,
}
assert Counter(row['source_manifest'] for row in rows) == {
    'src/media/race-preflight/manifest.json': 50,
    'src/media/race-preflight/arrival-manifest.json': 50,
    'src/media/race-preflight/venue-manifest.json': 20,
    'src/media/race-preflight/venue-arrival-manifest.json': 20,
    home_manifest: 6,
}
rows.sort(key=lambda row: row['mobile_path'])
buffer = io.StringIO(newline='')
writer = csv.DictWriter(buffer, fieldnames=FIELDS, lineterminator='\n')
writer.writeheader()
writer.writerows(rows)
expected = buffer.getvalue()
if sys.argv[1:] == ['--write']:
    SCHEDULE.write_text(expected)
else:
    assert not sys.argv[1:], 'Usage: check-h11-capture-evidence.py [--write]'
    assert SCHEDULE.read_text() == expected, 'H11 schedule differs from exact current evidence'
actual = sorted(p for p in (ROOT / 'dist/mobile').rglob('*') if p.is_file())
assert len(actual) == 204
for path in actual:
    item = ledger[str(path.relative_to(ROOT / 'dist/mobile'))]
    assert path.stat().st_size == int(item['bytes']) and sha(path.read_bytes()) == item['sha256']
print('H11 historical capture evidence schedule accounts for all 146 current exact files: Race 140; Home 6; separate limited owner disposition applies')
print('Race models at media introduction match 140 current accepted H03 bindings; 50 Highland poster and six Home manifest hashes match shipped bytes')
canon = ''.join(f"{path.relative_to(ROOT / 'dist/mobile')}\0{sha(path.read_bytes())}\0{path.stat().st_size}\n" for path in actual)
assert sha(canon.encode()) == '9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6'
assert sha((ROOT / 'dist/kicklab.html').read_bytes()) == '4c421ca7210d958927b9914c635f3042a3e5903ef3ba751a121648fd09a477db'
assert sha((ROOT / 'dist/mobile/index.html').read_bytes()) == '9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d'
print('204 package files and known web/mobile/package digests match; 73 videos have no audio stream; no media or product bytes changed')
