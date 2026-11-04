#!/usr/bin/env python3
"""Validate Phase 2 evidence states, phase boundary, receipt and exact package identity."""
import csv
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RELEASE = ROOT / 'docs/release'
ARTIFACT_BASE = 'f101d929f1c3bbff85a6c1d4023e1f873ae30d47'
CURRENT_DOC_BASE = 'a0be10e6cb23f9d13b8cba4078568b500165359a'
PACKAGE_SHA = '9466fda62e87a216b3a2895c861e114f7a7cfcf206adcde98bdb1cfffae96af6'
WEB_SHA = '4c421ca7210d958927b9914c635f3042a3e5903ef3ba751a121648fd09a477db'
MOBILE_SHA = '9ad9722ae2712c3b02c13deb8e165293a4e814aac7a05d3f06b794da64c1542d'
RECEIPT_ID = 'KL-P2-CLOSEOUT-INVENTORY-20261103-F101D92-001'
RECEIPT_SHA = 'cf2104fb2f8397c396df4451062aaac8ebeeac7aadd4e549faf376e307bb1c32'
PLAN_ID = 'KL-P3-PLAN-20261103-F101D92-001'
EXPECTED = {
    '204_file_rights': 'owner_adopted_phase2',
    'installed_notice': 'owner_adopted_current_package',
    'cobalt_residual': 'owner_accepted_residual_risk',
    'legal_registration': 'deferred_to_store_identity_gate',
    'kicklab_company_chain': 'owner_personal_creation_attested',
    'store_account_alignment': 'deferred_to_store_identity_gate',
    'support_target_control': 'email_verified_policy_deferred',
    'support_provider_controls': 'manual_controls_risk_accepted',
    'child_data_incident_process': 'owner_operating_statement_adopted',
    'privacy_data_flow': 'browser_scope_accepted_native_pending',
    'phase3_exact_plan': 'owner_adopted_plan_scope',
    'captain_signoff': 'phase2_closed',
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def rows(name):
    with (RELEASE / name).open(newline='') as handle:
        return list(csv.DictReader(handle))

matrix = rows('phase2-closeout-evidence-inventory.csv')
assert len(matrix) == len(EXPECTED)
assert {row['item']: row['status'] for row in matrix} == EXPECTED
for row in matrix:
    assert row['restricted_receipt_id'] == RECEIPT_ID
    assert row['restricted_receipt_sha256'] == RECEIPT_SHA
    assert row['public_evidence'] and row['missing_evidence'] and row['phase2_gate']
    for name in row['public_evidence'].split('; '):
        assert (RELEASE / name).is_file(), (row['item'], name)

private = Path('/Users/vambahsillah/.codex/private-evidence/KickLab') / (RECEIPT_ID + '.md')
if private.exists():
    assert private.stat().st_mode & 0o777 == 0o600
    assert sha(private.read_bytes()) == RECEIPT_SHA
    assert ARTIFACT_BASE in private.read_text()

inventory = (RELEASE / 'phase2-closeout-evidence-inventory.md').read_text()
owner = (RELEASE / 'phase2-final-owner-decision-template.md').read_text()
checklist = (RELEASE / 'phase2-captain-signoff-checklist.md').read_text()
plan = (RELEASE / 'phase3-native-qualification-plan.md').read_text()
roadmap = (RELEASE / 'phase2-closeout-phase3-entry.md').read_text()
mobile_roadmap = (RELEASE / 'mobile-qualification-roadmap.md').read_text()
closeout = (RELEASE / 'phase2-owner-closeout.md').read_text()
authorization = (RELEASE / 'phase3-unsigned-native-qualification-authorization.md').read_text()
for document in (inventory, checklist, plan, roadmap, closeout, authorization):
    assert CURRENT_DOC_BASE in document
assert RECEIPT_ID in inventory and RECEIPT_SHA in inventory
assert PLAN_ID in owner and PLAN_ID in plan
assert 'Owner-adopted as qualification scope' in plan
assert 'plan and entry criteria only' in plan
assert 'separate execution authorization' in plan and 'separate execution authorization' in checklist
assert 'Native qualification is a Phase 3 execution item' in roadmap
assert 'Actual native qualification is Phase 3 work' in roadmap
assert 'separate Phase 3 execution authorization' in mobile_roadmap
assert 'Pass for Phase 2' in checklist and 'Pass with owner-accepted residual risk' in checklist
assert '204 shipped package paths' in closeout and 'premium Cobalt' in closeout
assert 'No additional rights-evidence packet is required' in closeout
assert 'prepared for owner authorization; not executed' in authorization
assert 'no legal status, account ownership, domain control, provider setting or native behavior is inferred' in inventory

progress = (RELEASE / 'phase2-owner-decision-progress.md').read_text()
assert 'KL-P2-OWNER-WORKING-20261103-F415196-001' in progress
assert '9d09a59d2c6eb007d14cbebb265a836278ee4c4f20fb4fdbc05166f813647bfd' in progress
assert 'Controlled inbound routing and controlled outbound delivery' in progress
assert 'policy publication' in progress

ledger = rows('shipped-file-rights.csv')
plan_rows = rows('runtime-rights-evidence-plan.csv')
assert len(ledger) == 204 and len(plan_rows) == 203
assert len({row['mobile_path'] for row in ledger}) == 204
assert len({row['mobile_path'] for row in plan_rows}) == 203
assert all(row['release_disposition'].startswith('internal clear:') for row in ledger)
assert all(row['review_state'].startswith('internal clear:') for row in plan_rows)
assert sum(row['rights_group'] == 'H11' for row in plan_rows) == 146

package = ROOT / 'dist/mobile'
files = sorted(path for path in package.rglob('*') if path.is_file())
assert len(files) == 204
by_path = {row['mobile_path']: row for row in ledger}
assert {str(path.relative_to(package)) for path in files} == set(by_path)
for path in files:
    row = by_path[str(path.relative_to(package))]
    assert sha(path.read_bytes()) == row['sha256'] and path.stat().st_size == int(row['bytes'])
canon = ''.join(f'{path.relative_to(package)}\0{sha(path.read_bytes())}\0{path.stat().st_size}\n' for path in files)
assert sha(canon.encode()) == PACKAGE_SHA
assert sha((ROOT / 'dist/kicklab.html').read_bytes()) == WEB_SHA
assert sha((package / 'index.html').read_bytes()) == MOBILE_SHA
print('Phase 2 matrix: 12 required states; owner closeout adopted; store identity and privacy publication deferred to their operational gates')
print('Restricted inventory receipt bound; 204 exact package paths and deployed web/mobile/package digests match')
