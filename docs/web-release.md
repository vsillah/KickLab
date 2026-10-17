# Web release preparation

KickLab's web build is one self-contained file. `npm run check` builds and validates `dist/kicklab.html`, then stages an identical copy at `dist/pages/index.html`. The `prepare-pages-artifact` workflow uploads `dist/pages` as a GitHub Pages-compatible artifact for review.

## Prepare-only boundary

This repository does not currently deploy or activate GitHub Pages. The workflow:

- runs only for pull requests that touch its inputs or by manual dispatch;
- grants only read access to repository contents;
- builds the existing static artifact and uploads the prepared artifact;
- does not request Pages or identity-token write permissions;
- does not declare a deployment environment or invoke a Pages deployment action; and
- does not change repository settings, DNS, provider accounts, credentials, or secrets.

Uploading the workflow artifact proves only that the static bundle can be packaged. It does not prove that a public site exists.

## Artifact structure

```text
dist/
  kicklab.html       canonical self-contained build
  game.js            syntax-check output
  pages/
    index.html       byte-for-byte copy of kicklab.html
```

Only `dist/pages` is passed to the Pages artifact uploader. The contract check rejects extra files or symbolic links in that directory.

## Manual verification

From the repository root with Node 18 or newer:

```sh
npm run check
cmp dist/kicklab.html dist/pages/index.html
python3 -m http.server 4173 --directory dist/pages
```

Then open `http://127.0.0.1:4173/` and confirm KickLab loads from the staged `index.html`. Stop the local server with `Control-C`. The local server is optional smoke evidence and does not publish the game.

In GitHub, open the `prepare-pages-artifact` workflow run and confirm its `github-pages` artifact was created. Do not interpret that artifact as a deployment.

## Future activation gate

Public release requires a separate, explicit authorization. Only after that approval should a repository owner enable GitHub Pages with GitHub Actions as its source and add a deployment job with the required Pages write permission, identity-token write permission, `github-pages` environment, and official Pages deployment action. DNS or custom-domain work is a separate gate.

## Rollback

Before activation, rollback is source-only: revert the commit that adds `.github/workflows/pages-prepare.yml`, `scripts/prepare-pages.mjs`, `scripts/check-pages-prepare.mjs`, and this document, then restore the earlier `package.json`. Generated `dist` files are ignored and can be rebuilt at any time. No hosted site or provider state needs rollback because this preparation does not create either one.
