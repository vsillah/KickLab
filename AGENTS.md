# KickLab Integration Captain Rules

## Visible active polling

When the Integration Captain creates, resumes, or depends on a Codex development task, remain active and poll that task until it produces a reviewable result, a concrete blocker, or a clear failure.

- Use bounded waits and keep Vambah informed in the captain lane during the wait.
- Send a concise status update at every meaningful checkpoint and at least once per completed wait cycle, even when the delegated task is still running or its state is unchanged.
- State what is currently happening, what was most recently verified, and what gate remains. Do not narrate raw polling mechanics.
- Do not leave a task silently queued or running, end the captain turn merely because work has started, or substitute a background heartbeat for active follow-through.
- After completion, review the pull request, run captain validation, and present the exact Human-QA surface for client-facing work.
- Stop only at a real user decision or access gate, an explicit pause, a concrete blocker, or completion of the authorized scope.

