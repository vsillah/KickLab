# Phase 2 Wave 2 held-file recovery audit

Base: deployed `origin/main` `fbce23a85a477a8efa1ae37bde0d4b5bd110c3bf`. This is a bounded evidence search for the four held Wave 2 rows, with no product, asset, runtime, or package change. All four remain **held**. The restricted receipt `KL-P2-W2R-20261103-FBCE23A-4-001` is outside Git; its SHA-256 is `a4e30613ef152c015667642756ddc1c3ac7450e689a2819a07f9e55028e7de13`.

The audit searched the current and older KickLab Git history, indexed local project and archive locations, the restricted W1 and W2 rights folders, and bounded Open Brain queries. It found lineage and source files, but no original v42 creator assignment or redistribution grant, published original v42 HTML, or original exact still-render receipt. This search does not establish that such records do not exist elsewhere. [Initial v42 input lineage](phase2-wave2-v42-import-lineage.csv) records the 23 source inputs in import commit `4690e4c6b911b23f24b1e3b8cb4aa1c63938ecad`, their import and current hashes, and their unresolved rights status. Source possession, later edits, and deterministic bundling do not establish rights to embedded content.

| Exact shipped path | SHA-256 | Bytes | Disposition |
| --- | --- | ---: | --- |
| `index.html` | `c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294` | 2,638,152 | held |
| `assets/garage/roster/v1/cobalt.webp` | `e2028ee6f5da5b5a99363bcfdba14bdd7a9ae1ed4f6ac1bb01c22153b15eee5d` | 14,076 | held |
| `assets/garage/roster/v1/kestrel.webp` | `21fb5119b6fde4a780288c6bdebc5c55ef9c9d6ad4898bc7b5959470fcd15beb` | 13,050 | held |
| `assets/garage/roster/v1/vesper.webp` | `fb9ae8d29844f5c9ec491d6b0a31947fad22771ac68729315c9b7691ae08c34a` | 11,928 | held |

## `index.html` — imported v42 content

The initial import commit and current `scripts/build.mjs` establish a source history and current source-to-bundle path. The exact current mobile HTML hash matches the ledger; the published Pages HTML has its separate expected hash `20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c`. The current Three.js MIT notice is verified, but it covers only that library. No dated creator or assignment record and redistribution terms were recovered for the other imported v42 code, art, or sound. The 23-input CSV is an initial import map, not a complete component-level rights grant or full map of every embedded asset.

**Recovery requirement:** obtain a dated creator/assignment and commercial redistribution chain identifying the original v42 source and each embedded third-party input, then map that evidence to the exact packaged HTML. If an input cannot be supported, a separate product lane must replace that input, rebuild the HTML, review functionality and notices, and bind a new package hash before a new owner decision. Inspect actual frames and input inventories before determining which of the 146 held H11 captures need recapture.

## `cobalt.webp` — exact still lineage

The shipped WebP and checked-in Blender scene are retained in Git, and the current renderer script has a stable Git blob. The documented isolated Blender 5.1.2 render with `cwebp -q 84` produced `d55367a4017514602be954a5c7fa55a19bf394d17e98ad34a2b262f0fc5c8785`, which differs from the shipped hash. The decoded pixel data differs too, so changing only WebP encoder settings does not explain the result. The scene has no external image input other than empty render placeholders. The accepted Cobalt model decision retains its disclosed upstream provenance gap; it does not clear this still.

**Recovery requirement:** recover the historical scene, renderer settings and version, and encoder chain that reproduces the shipped WebP exactly, with a source/rights record. Otherwise, commission a separately reviewed still replacement from approved inputs, preserving the Cobalt Garage ID, choice labeling, and accessibility. Review the 28 Cobalt model-dependent H11 paths if the model, scene, or other capture input changes; thumbnail-only replacement does not automatically recapture them.

## `kestrel.webp` — exact still lineage

The shipped WebP and checked-in Kestrel scene are retained. The same isolated render path produced `0c0ee47a3a7b9171445a14370bc653d085a6b9e0837b6f7ad786bc5572077167`, and decoded pixels differ from the shipped still. The scene has no external image input beyond empty render placeholders. No historical render receipt was recovered.

**Recovery requirement:** reproduce the exact shipped still from documented historical inputs and rights, or create and review a replacement in a separate product lane. Preserve the Kestrel Garage ID and accessible choice. Review its 28 model-dependent H11 paths only if their capture inputs change.

## `vesper.webp` — exact still lineage

The shipped WebP and checked-in Vesper scene are retained. The same isolated render path produced `a228049a05e79d569421cc4b1f2630f82a24d9529720d46a166a01740e1d8df5`, and decoded pixels differ from the shipped still. The scene has no external image input beyond empty render placeholders. No historical render receipt was recovered.

**Recovery requirement:** reproduce the exact shipped still from documented historical inputs and rights, or create and review a replacement in a separate product lane. Preserve the Vesper Garage ID and accessible choice. Review its 28 model-dependent H11 paths only if their capture inputs change.

For all three stills, WebP quality settings 80, 82, 84, 86, 88, and 90 failed to match the shipped hashes. The [Wave 2 decision](phase2-wave2-internal-rights-decision.md), [exact-file review matrix](phase2-wave2-exact-file-review.csv), and [H11 recapture map](runtime-rights-recapture-map.csv) remain authoritative for the existing holds and dependencies. The source files are evidence of local possession, not by themselves a complete origin or commercial-rights chain. Keep 175 runtime paths held and 29 shipped paths accepted for preparation; no Phase 3, native, signing, distribution, store, publication, or merge decision follows from this audit.
