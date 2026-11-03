#!/usr/bin/env python3
"""Verify the bounded H11 owner decision against exact deployed package bytes."""
import csv
import hashlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RELEASE = ROOT / 'docs/release'
RECEIPT_ID = 'KL-P2-H11-OD-20261103-CAF2699-146-001'
RECEIPT_SHA = 'ceb86cce6feec570d1edd614496cc6cd93cb4d6c63dae18939eb2cc49ed9c27b'
SCHEDULE_SHA = '2509e15ae642d87c21672a47cc581b5d8e1cc81a0bf4df0eab874c3014706653'
PACKAGE_SHA = '9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6'
WEB_SHA = '4c421ca7210d958927b9914c635f3042a3e5903ef3ba751a121648fd09a477db'
MOBILE_SHA = '9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read_csv(name):
    with (RELEASE / name).open(newline='') as handle:
        return list(csv.DictReader(handle))

schedule_path = RELEASE / 'phase2-h11-owner-disposition-schedule.csv'
assert sha(schedule_path.read_bytes()) == SCHEDULE_SHA
schedule = read_csv(schedule_path.name)
reconstruction = read_csv('phase2-h11-capture-evidence.csv')
ledger = read_csv('shipped-file-rights.csv')
action = read_csv('rights-action-map.csv')
plan = read_csv('runtime-rights-evidence-plan.csv')
assert len(schedule) == len(reconstruction) == 146
assert len(ledger) == len(action) == 204 and len(plan) == 203
for name, rows, key in (
    ('schedule', schedule, 'mobile_path'), ('reconstruction', reconstruction, 'mobile_path'),
    ('ledger', ledger, 'mobile_path'), ('action', action, 'mobile_path'), ('plan', plan, 'mobile_path'),
):
    assert len({row[key] for row in rows}) == len(rows), name
s = {row['mobile_path']: row for row in schedule}
r = {row['mobile_path']: row for row in reconstruction}
l = {row['mobile_path']: row for row in ledger}
a = {row['mobile_path']: row for row in action}
p = {row['mobile_path']: row for row in plan}
assert set(s) == set(r) == {path for path in p if p[path]['rights_group'] == 'H11'}
assert set(l) == set(a) and set(p) == set(l) - {'THIRD-PARTY-NOTICES.txt'}
assert Counter(row['media_role'] for row in schedule) == {'video': 73, 'poster': 73}
assert Counter(row['vehicle'] for row in schedule) == {'': 6, 'aegis': 28, 'cobalt': 28, 'kestrel': 28, 'sable': 28, 'vesper': 28}
assert Counter(row['capture_cohort'] for row in schedule) == {
    'race-d8fe62a78572be11d21f5c2afbe3953068757c50': 60,
    'race-86877504645991e799ef1f6036c3c168bbaa74ee': 40,
    'race-0dcbeff4a6aa72cac2f10685560c8e32139660e6': 40,
    'home-fight-db08f39641a8c8c1daa70bd1f3b967296cc5792a': 2,
    'home-kick-eeee5daf3ce3075d352090ce00ccd346b1da8638': 2,
    'home-race-43e0e6a273b062771e37c7e45d1ca56745d28a15': 2,
}
for path, item in s.items():
    assert item['sha256'] == r[path]['sha256'] == l[path]['sha256'] == a[path]['sha256'] == p[path]['sha256']
    assert item['bytes'] == r[path]['bytes'] == l[path]['bytes'] == p[path]['bytes']
    assert item['source_manifest'] == r[path]['source_manifest']
    assert item['media_role'] == r[path]['media_role'] and item['vehicle'] == r[path]['vehicle']
    expected_cohort = ('race-' if r[path]['capture_revision_evidence'].startswith('Git media-introduction commit ') else 'home-' + r[path]['mode_or_lab'].lower() + '-') + r[path]['capture_revision_evidence'].split()[3].split(';')[0]
    assert item['capture_cohort'] == expected_cohort
    assert item['decision_scope'].startswith('continued commercial preparation only; exact hash')
    is_cobalt = item['vehicle'] == 'cobalt'
    assert bool(item['cobalt_residual_risk']) == is_cobalt
    assert item['cobalt_residual_risk'] == r[path]['cobalt_residual_risk']
    assert a[path]['action_group'] == p[path]['rights_group'] == 'H11'
    assert p[path]['default_disposition'] == 'clear with evidence'
    for state in (l[path]['release_disposition'], a[path]['current_disposition'], p[path]['review_state']):
        assert state.startswith('internal clear: continued commercial preparation only')
        assert RECEIPT_ID in state and RECEIPT_SHA in state
        assert 'reopen on changed hash or conflicting evidence' in state
        assert 'no signing, distribution, submission, release or Phase 2 closeout' in state
        assert ('premium Cobalt residual model provenance risk carried to this capture' in state) == is_cobalt
    assert 'phase2-h11-owner-disposition.md' in l[path]['evidence_location']
    assert 'Historical runtime/build receipt and full frame-by-frame input bill were not recovered' in p[path]['missing_owner_evidence']
    assert sha((ROOT / 'src' / path).read_bytes()) == item['sha256']
    assert (ROOT / 'src' / path).stat().st_size == int(item['bytes'])

assert all(row['release_disposition'].startswith('internal clear:') for row in ledger)
assert all(row['current_disposition'].startswith('internal clear:') for row in action)
assert all(row['review_state'].startswith('internal clear:') for row in plan)
assert Counter(row['wave'] for row in plan) == {'W1': 21, 'W2': 11, 'W3': 25, 'W4': 146}
assert 'H11 146' in (RELEASE / 'phase2-h11-owner-disposition.md').read_text()
assert RECEIPT_SHA in (RELEASE / 'phase2-h11-owner-disposition.md').read_text()
private = Path('/Users/vambahsillah/.codex/private-evidence/KickLab') / (RECEIPT_ID + '.md')
if private.exists():
    assert private.stat().st_mode & 0o777 == 0o600
    assert sha(private.read_bytes()) == RECEIPT_SHA
    assert SCHEDULE_SHA in private.read_text()

files = sorted(path for path in (ROOT / 'dist/mobile').rglob('*') if path.is_file())
assert len(files) == 204 and {str(path.relative_to(ROOT / 'dist/mobile')) for path in files} == set(l)
for path in files:
    item = l[str(path.relative_to(ROOT / 'dist/mobile'))]
    assert path.stat().st_size == int(item['bytes']) and sha(path.read_bytes()) == item['sha256']
canon = ''.join(f"{path.relative_to(ROOT / 'dist/mobile')}\0{sha(path.read_bytes())}\0{path.stat().st_size}\n" for path in files)
assert sha(canon.encode()) == PACKAGE_SHA
assert sha((ROOT / 'dist/kicklab.html').read_bytes()) == WEB_SHA
assert sha((ROOT / 'dist/mobile/index.html').read_bytes()) == MOBILE_SHA
print('H11 146 exact owner decisions once: Race 140, Home 6, Cobalt risk 28; runtime 203 accepted/0 held; package 204 accepted/0 held')
print('204 package paths, 146 source media, exact deployed package/web/mobile digests, and restricted receipt binding match')
