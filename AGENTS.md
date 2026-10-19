# KickLab Integration Captain Rules

## Refresh localhost after every release

After every successful KickLab merge and release, refresh the integrated Codex browser to a localhost build created from the exact deployed merge commit before ending the captain work round.

- Start or restart localhost from a clean checkout of the exact deployed commit; do not reuse an older server process, worktree, build artifact, or unchanged browser URL.
- Rebuild and validate the local artifact, then use a fresh port or stop the stale process before reusing its port.
- Open the localhost build in the integrated browser with the full commit SHA in a `rev` query parameter and navigate to the relevant released gameplay state.
- Verify the rendered page reflects the released change, mark that localhost tab as the user-facing handoff, and report the exact commit, port, and URL.
- Keep the production URL as separate deployment evidence. Do not leave production, a preview, or a stale localhost tab as the default review surface after release.
- If the exact released localhost build cannot be started or verified, report the concrete blocker and keep release closeout incomplete.
