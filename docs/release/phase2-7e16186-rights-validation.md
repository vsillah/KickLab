# Phase 2 rights packet validation — main `7e16186`

Recorded 2026-11-01 from branch `codex/kicklab-phase2-rights-owner-decisions`, based on exact deployed `origin/main` `7e16186ba85d5f8048104819ae53602870ffecb3`.

## Package identity

| Output | SHA-256 |
| --- | --- |
| `dist/kicklab.html` and `dist/pages/index.html` | `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c` |
| `dist/mobile/index.html` | `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294` |
| `dist/mobile/kicklab-mobile-manifest.json` | `2240980d130d80d92967248ec58d7cbfee7f519ff51674b2996d2b6a92ff47d5` |

The post-edit mobile build has **236 files**, and every relative path and SHA-256 matches the pre-edit baseline saved before documentation changes. The rights ledger and exact-path action map each have 236 unique paths. Ledger dispositions remain 211 hold, 23 exclude from release, and two metadata decisions. The action map assigns each path to one of 17 owner-action groups. The current dependency ledger has 128 lockfile package rows; the package paths and pinned versions were checked against `package-lock.json`. The notice draft was transcribed from the installed package license files or, for `qrcode-generator`, its source header and a marked MIT reconstruction that still needs upstream confirmation.

## Checks run

- `npm ci` — completed against the pinned lockfile. npm reported five moderate development-tree audit findings; the separate `npm audit --omit=dev --json` returned zero production-tree findings. This does not audit later native dependencies.
- `npm run check` — passed, including 316 project tests, asset validation, web contract, and Pages release contract.
- `npm run mobile:check` — passed all six checks. The qualification assertion now requires the qualified browser row to cite the exact merge and both artifact hashes, while every later gate remains unqualified.
- Recomputed SHA-256 for every built mobile file and compared with the pre-edit baseline — 236 of 236 identical.
- Checked current qualification JSON — Browser Gate 1 qualified at the cited merge; the other six gates remain `not_run`.

## Scope and remaining hold

Only release documentation, evidence CSV/JSON, and the qualification assertion changed. No game source, asset, package manifest, native project, or distribution output changed. No native build, physical-device run, store-console action, email/DNS setup, signed owner disposition, external IP/privacy review, installed legal notice, or policy publication was performed. The [Phase 2 exit packet](phase2-closeout-phase3-entry.md) remains open until the exact-file rights, package exclusions/replacements, notices, legal identity, support controls, and external review are resolved.
