# Runtime rights plan validation

Run on the documentation-only branch `codex/kicklab-phase2-runtime-rights-plan` from exact deployed `origin/main` `2140e0cf0c3d74845a7e384aa8200a46cde9115f`. No source, asset, package configuration, dependency, generated media, or product-output file was edited.

| Check | Result |
| --- | --- |
| `npm ci` | Passed against the lockfile. npm reported five moderate findings in the installed tree; this round did not change dependencies. |
| `npm run check` | Passed: 317 tests, 3D asset validation, web contract, and Pages release contract. |
| `npm run mobile:check` | Passed: seven mobile package checks. |
| Ledger/plan schema and count reconciliation | 210 unique shipped ledger/action-map paths; 209 unique runtime-plan rows plus one held N01 notice; all plan fields populated; SHA-256, bytes, group, held state and package file matched for every row. |
| Ordered work program | W1 27 + W2 11 + W3 25 + W4 146 = 209. Defaults: 52 clear-with-evidence, 11 remove-behind-reviewed-fallback, 146 recapture/regenerate. No row was marked cleared. |
| Capture dependency map | All 146 H11 paths mapped once: 140 Race preflight and six Home preview files. All Race source manifests exist, all five model paths exist in the package, and each model maps to 28 media files. |
| Consumer and document references | Every listed consumer-evidence path and relevant local Markdown link resolved. The 11 packaged-only rows explicitly require a later live-reference/fallback review. |
| Output identity | Web and Pages HTML SHA-256 `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`; mobile HTML `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294`; 210-file sorted-path mobile tree `b1e7f5768b579c323bafce41a3972e94ba8d3ea313f4aaee068b35f1e537eefa`. All match the merged package-minimization baseline. |
| `git diff --check` | Passed. |

The first one-off reconciliation command failed **after its assertions** because its final print statement iterated dictionary keys as row objects (`for r in P` instead of `for r in plan`). The print statement was corrected and the complete assertion set reran successfully; no count, hash or schema assertion was weakened. This was a validation-script typo, not a package or ledger mismatch.

This round did not run a new browser, native, device, support-provider, store, or customer-data smoke. The merged package-minimization browser/privacy results remain in [its QA record](../evidence/phase2-package-minimization-qa.json). Those results are bound to the unchanged package tree, but they do not clear rights, native data flow, or release.
