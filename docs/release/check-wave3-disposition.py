#!/usr/bin/env python3
"""Reconcile the exact Wave 3 disposition across current package rights records."""
import csv
import hashlib
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[2]
release = root / 'docs/release'
files = {
    name: list(csv.DictReader((release / name).open(newline='')))
    for name in (
        'phase2-wave3-owner-intake-schedule.csv',
        'phase2-wave3-exact-file-review.csv',
        'shipped-file-rights.csv',
        'rights-action-map.csv',
        'runtime-rights-evidence-plan.csv',
    )
}
schedule = files['phase2-wave3-owner-intake-schedule.csv']
assert len(schedule) == 25
assert Counter(row['rights_group'] for row in schedule) == {'H04': 15, 'H05': 9, 'H10': 1}
identity = {(row['mobile_path'], row['sha256'], row['bytes']) for row in schedule}
assert len(identity) == len(schedule)
for row in schedule:
    asset = root / 'src' / row['mobile_path']
    assert asset.stat().st_size == int(row['bytes']), asset
    assert hashlib.sha256(asset.read_bytes()).hexdigest() == row['sha256'], asset

for name, rows in files.items():
    keyed = {row['mobile_path']: row for row in rows}
    assert len(keyed) == len(rows), name
    for item in schedule:
        row = keyed[item['mobile_path']]
        assert row['sha256'] == item['sha256'], name
        if 'bytes' in row:
            assert row['bytes'] == item['bytes'], name
        if 'rights_group' in row:
            assert row['rights_group'] == item['rights_group'], name
        if 'action_group' in row:
            assert row['action_group'] == item['rights_group'], name
        state = row.get('review_state', row.get('decision', row.get('release_disposition', row.get('current_disposition'))))
        assert state.startswith('internal clear: continued commercial preparation only'), (name, item['mobile_path'])
        assert 'no distribution' in state or 'no release' in state, (name, item['mobile_path'])
        if item['rights_group'] == 'H10':
            assert ('historical original PNG not located' in ' '.join(row.values()) or 'original PNG to WebP' in ' '.join(row.values())), name

ledger = files['shipped-file-rights.csv']
plan = files['runtime-rights-evidence-plan.csv']
assert len(ledger) == 204 and len(plan) == 203 and len(files['rights-action-map.csv']) == 204
held = sum(row['review_state'].startswith('held') for row in plan)
accepted = sum(row['review_state'].startswith('internal clear') for row in plan)
assert held + accepted == len(plan)
assert Counter((row['wave'], row['review_state'].startswith('held')) for row in plan) == {
    ('W1', False): 21, ('W2', False): 11, ('W3', False): 25, ('W4', True): 146
}
assert sum(row['release_disposition'].startswith('hold') for row in ledger) == held
assert len(ledger) - held == accepted + 1  # installed notice
print(f'W3 {len(schedule)} accepted; runtime {accepted} accepted/{held} held; package {len(ledger)-held} accepted/{held} held')
