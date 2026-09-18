# Reviewing a sync PR

**Read this before you review or merge a `sync/from-*` pull request.**

This file lives in a framework path, so it travels with the tooling and is the
same in every repo.

---

## What this PR is

The framework repo (`thenb-in/startup`) and the app repos built on it both get
real work. A nightly job replays the other side's framework-relevant commits
onto a sync branch and opens one PR per direction.

Each commit crosses **individually**, keeping its original author, date and
subject, plus a `Synced-from-<repo>: <sha>` trailer. So `git blame` still
points at the person who wrote the line, in whichever repo they wrote it.

---

## The one hard rule

> ### Merge with a merge commit. Never squash.

A squash collapses every replayed commit into one. That destroys the
per-commit history this whole design exists to preserve, **and** it eats the
`Synced-from-*` trailers — which is where the next night reads its resume
point from. Squash a sync PR and the next run replays everything again on top
of what you just merged.

If branch protection forces squash merges, `sync/*` branches need an
exemption. Rebase-merge is also fine (trailers survive); squash is not.

Two more things not to do:

* **Don't force-push the branch.** It is long-lived on purpose (see below).
* **Don't close the PR to "start clean".** The branch *is* the state. Closing
  it makes the next run re-derive a resume point from the base branch and
  replay everything the PR was carrying.

---

## How to review it

Read it like a PR from the other team, because that's what it is — these are
real commits someone wrote.

1. **Check the summary in the PR body** — commits applied, skipped, and the
   unresolved conflict count.
2. **Read the per-commit log**, attached to the workflow run as an artifact
   (`sync-log.md`). It says, for every commit, exactly which files crossed,
   which merged, which conflicted and which were skipped, and why.
3. **Let CI run.** The branch is kept buildable on purpose, so a red test here
   is real signal: usually a framework change that needs an app-side
   adaptation.
4. **Resolve any conflicts** (next section), then merge.

### Why the branch is long-lived

If this PR sits open for a week, each night **appends** to the same branch
rather than cutting a fresh one. That matters: a fresh branch off the base
wouldn't contain the previous nights' commits, so it would conflict on files
that had no conflict at all, and get worse every night. It also means
**anything you resolve here stays resolved** — later commits merge against
your resolution instead of re-conflicting.

---

## Resolving a conflict

Divergence usually isn't a conflict. Non-overlapping edits to the same file
are three-way merged and never reach you. You only see the cases where both
sides changed the same lines.

When that happens:

* The **real file in the tree** holds a merge that takes the incoming side
  *only where the two genuinely overlap* — your repo's other edits to that
  file are kept.
* The **full three-way merge** is parked at
  `sync-conflicts/files/<original/path>.conflict`, showing your side, the
  common ancestor, and the incoming side.
* `sync-conflicts/REPORT.md` lists every one of them.

To resolve:

1. Open the `.conflict` file and read all three sides.
2. Edit the **real** file to the reconciled result.
3. **Delete the `.conflict` file.**
4. Commit and push to the sync branch.

The `sync-conflicts` check fails while anything is parked, so the PR cannot be
merged until `sync-conflicts/` is empty. That is deliberate — it is the only
thing standing between a contested change and being silently dropped.

> Never delete a `.conflict` file without reconciling the real file. That is
> the one action that turns this system into a silent data-loss machine.

---

## What crosses, and what doesn't

| Bucket | Paths | Behaviour |
|---|---|---|
| **Framework** | `startup/`, `nucleus/`, `report_runner/`, `lints/`, `deploy/`, `.github/`, `.vscode/`, `.husky/`, `scripts/lib/sync/` | Always crosses, and a commit must touch at least one to cross at all |
| **Ride-along** | `db-scripts/startup/` | Crosses, but can't pull a commit across on its own |
| **Never** | `tests/`, any `package.json` / `package-lock.json`, `startup/client/src/pages/AppDashboard.jsx`, `sync-conflicts/` | Never crosses, either direction |
| **App** | everything else | Crosses **only if the target repo already has the file** — sync never creates a new app file |

Two consequences worth knowing:

* **A commit that touches no framework path is skipped entirely.** If you want
  a change to reach the other repo, it has to touch a framework path.
* **Manifests never cross.** A framework change needing a new runtime
  dependency will arrive without it — vendor the dependency by hand.

Commits that originated in the *other* repo are skipped, so nothing
round-trips. Merge commits are skipped; their content came from their parents.

---

## When something looks wrong

* **The PR looks empty or is missing commits** — check the run log for
  `skipped` lines. The reason is recorded per commit.
* **You need to re-run** — trigger the workflow manually
  (`workflow_dispatch`). It is safe to re-run: the resume point comes from the
  branch, so it picks up exactly where it left off.
* **You need to replay from a specific point** — pass `start_from_sha` to the
  manual run. Only needed if the trailers have been damaged (usually by a
  squash merge).
* **A run failed partway** — it halts on the first error rather than
  compounding the mess, and rolls back the half-applied commit. Fix the cause
  and re-run; nothing needs unpicking by hand.

---

## One-time repo setup

* **Require the `sync-conflicts` check** on the default branch. Without it the
  conflict gate is decorative and parked conflicts can merge.
* **Exempt `sync/*` from any squash-merge requirement** (see the hard rule
  above).
* **The Octo STS trust policy** at `.github/chainguard/app-token.sts.yaml`
  must be present. It is a synced framework file, so it arrives on its own —
  but the very first sync into a brand-new app repo needs it there already.
  Both directions authenticate every write with a short-lived token minted
  from it; the built-in `GITHUB_TOKEN` is never used for writes, partly
  because GitHub suppresses workflow runs for anything it does, which would
  leave sync PRs with no CI results.

---

Implementation lives alongside this file; start with `engine.js`.
