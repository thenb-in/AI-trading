# Unresolved sync conflicts

2 file(s) could not be merged automatically while syncing etime-payroll -> startup.

**This PR is blocked until this directory is empty.** The `sync-conflicts` check fails while any `.conflict` file remains.

## How to resolve

1. Open the `.conflict` file under `sync-conflicts/files/`.
2. It holds a diff3 merge: `startup` (what this repo had), the common ancestor, and `etime-payroll` (what is being synced in).
3. Edit the **real** file to the reconciled result.
4. Delete the `.conflict` file. When `sync-conflicts/` is empty, the check passes.

The real file currently holds the `etime-payroll` version — the source wins in the tree so the branch stays buildable and testable. Anything this repo had that the source overwrote is in the `.conflict` file, not lost.

2 further file(s) conflicted against an intermediate commit but merged cleanly against the source tip, and were resolved automatically: `app/client/src/filter/reportFilterConfig.js`, `app/client/src/services/api.js`.

## Conflicts

| File | Kind | Source commit | Parked as |
|---|---|---|---|
| `app/server/src/constants/app_permissions.js` | modified on both sides | `3cfb8522a325` | `sync-conflicts/files/app/server/src/constants/app_permissions.js.conflict` |
| `app/server/src/routes/reportRoutes.js` | modified on both sides | `3cfb8522a325` | `sync-conflicts/files/app/server/src/routes/reportRoutes.js.conflict` |
