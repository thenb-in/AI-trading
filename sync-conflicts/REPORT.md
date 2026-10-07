# Unresolved sync conflicts

6 file(s) could not be merged automatically while syncing erp -> startup.

**This PR is blocked until this directory is empty.** The `sync-conflicts` check fails while any `.conflict` file remains.

## How to resolve

1. Open the `.conflict` file under `sync-conflicts/files/`.
2. It holds a diff3 merge: `startup` (what this repo had), the common ancestor, and `erp` (what is being synced in).
3. Edit the **real** file to the reconciled result.
4. Delete the `.conflict` file. When `sync-conflicts/` is empty, the check passes.

The real file currently holds the `erp` version — the source wins in the tree so the branch stays buildable and testable. Anything this repo had that the source overwrote is in the `.conflict` file, not lost.

## Conflicts

| File | Kind | Source commit | Parked as |
|---|---|---|---|
| `startup/docs/src/css/custom.css` | modified on both sides | `4772ba27a02e` | `sync-conflicts/files/startup/docs/src/css/custom.css.conflict` |
| `app/client/src/data/registerAppData.js` | parked by an earlier run | `` | `sync-conflicts/files/app/client/src/data/registerAppData.js.conflict` |
| `app/client/src/services/api.js` | parked by an earlier run | `` | `sync-conflicts/files/app/client/src/services/api.js.conflict` |
| `app/client/vite.config.js` | parked by an earlier run | `` | `sync-conflicts/files/app/client/vite.config.js.conflict` |
| `app/server/.env.example` | parked by an earlier run | `` | `sync-conflicts/files/app/server/.env.example.conflict` |
| `app/server/src/routes/reportRoutes.js` | parked by an earlier run | `` | `sync-conflicts/files/app/server/src/routes/reportRoutes.js.conflict` |
