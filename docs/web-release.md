# Web release

KickLab's web build is one self-contained file. `npm run check` builds and validates `dist/kicklab.html`, then stages an identical copy at `dist/pages/index.html`. The `pages-release` workflow uploads `dist/pages` as a GitHub Pages-compatible artifact and can deploy it to `https://vsillah.github.io/KickLab/` after repository activation and merge.

## Release boundary

The workflow separates preparation from deployment:

- pull requests build, validate, and upload the artifact but cannot run the deploy job;
- pushes to `main` prepare and deploy the artifact;
- manual runs prepare the artifact, but deploy only when `deploy_production` is explicitly selected and the run uses the `main` branch;
- the prepare job has read-only repository access;
- the deploy job has only `pages: write` and `id-token: write`; and
- deployment targets the protected `github-pages` environment and reports the action's deployed URL.

The workflow does not configure repository settings, custom domains, DNS, other providers, credentials, analytics, or secrets. A pull-request artifact proves packaging only, not a public release.

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

In GitHub, open the `pages-release` workflow run and confirm its `github-pages` artifact was created. On pull requests, the deploy job must be skipped.

## Activation

The development lane must stop after opening its draft pull request. The integration captain performs activation only after review:

1. In GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. Do not set a custom domain.
3. Merge the reviewed deployment-capability pull request into `main`.
4. Open the resulting `pages-release` Actions run. Confirm `prepare` succeeds before `deploy`, and confirm the deployment targets the `github-pages` environment.
5. Confirm the reported deployment URL is exactly `https://vsillah.github.io/KickLab/` before production smoke.

A manual production deployment is bounded to the `main` branch. Open **Actions → pages-release → Run workflow**, choose `main`, select `deploy_production`, and run it. Leaving the checkbox clear prepares an artifact without deploying it.

Custom-domain and DNS work remains a separate, unauthorized gate.

## Production smoke

After the captain confirms a successful deployment:

```sh
curl --fail --location --silent --show-error \
  --output /tmp/kicklab-pages.html \
  https://vsillah.github.io/KickLab/
cmp dist/kicklab.html /tmp/kicklab-pages.html
```

Open the exact URL with a commit-bound cache-busting query, such as `https://vsillah.github.io/KickLab/?rev=<merge-commit>`. Confirm the KickLab lab chooser loads, Fight/Race/Kick remain available, the browser reports no failed same-origin assets, and local progress remains device-local. A content mismatch or wrong URL fails the release gate.

## Rollback

Before activation, revert the deployment-capability commit; no hosted state has changed. After activation, revert the faulty source commit on `main`, allow `pages-release` to redeploy the known-good artifact, and repeat production smoke. If the site must be taken offline instead, the integration captain can unpublish it from **Settings → Pages**. Removing the workflow alone does not remove an already deployed site.

Generated `dist` files remain ignored and can always be rebuilt. Rollback does not require DNS or provider changes because the release uses only the default project URL.
