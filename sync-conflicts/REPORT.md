# Unresolved sync conflicts

11 file(s) could not be merged automatically while syncing etime-payroll -> startup.

**This PR is blocked until this directory is empty.** The `sync-conflicts` check fails while any `.conflict` file remains.

## How to resolve

1. Open the `.conflict` file under `sync-conflicts/files/`.
2. It holds a diff3 merge: `startup` (what this repo had), the common ancestor, and `etime-payroll` (what is being synced in).
3. Edit the **real** file to the reconciled result.
4. Delete the `.conflict` file. When `sync-conflicts/` is empty, the check passes.

The real file currently holds the `etime-payroll` version — the source wins in the tree so the branch stays buildable and testable. Anything this repo had that the source overwrote is in the `.conflict` file, not lost.

2 further file(s) conflicted against an intermediate commit but merged cleanly against the source tip, and were resolved automatically: `startup/server/src/socket/init_setup/reports/registry.js`, `startup/client/src/components/AuthenticatorButton.jsx`.

## Conflicts

| File | Kind | Source commit | Parked as |
|---|---|---|---|
| `startup/client/src/components/base_components/master/master_modal/FormModal.jsx` | modified on both sides | `ef1d3bd62bf8` | `sync-conflicts/files/startup/client/src/components/base_components/master/master_modal/FormModal.jsx.conflict` |
| `startup/client/src/components/masters/naming_series_master/NamingSeriesMasterForm.jsx` | modified on both sides | `e21b3cb822fc` | `sync-conflicts/files/startup/client/src/components/masters/naming_series_master/NamingSeriesMasterForm.jsx.conflict` |
| `startup/client/src/components/masters/nbnext_drive_master/NBnextDriveAttachment.jsx` | modified on both sides | `ae82b019928b` | `sync-conflicts/files/startup/client/src/components/masters/nbnext_drive_master/NBnextDriveAttachment.jsx.conflict` |
| `startup/client/src/utils/apiErrorMessage.js` | modified on both sides | `ae82b019928b` | `sync-conflicts/files/startup/client/src/utils/apiErrorMessage.js.conflict` |
| `startup/client/src/components/base_components/master/BaseMaster.jsx` | modified on both sides | `23830825217d` | `sync-conflicts/files/startup/client/src/components/base_components/master/BaseMaster.jsx.conflict` |
| `startup/client/src/components/base_components/master/baseMasterPropTypes.js` | added on both sides | `23830825217d` | `sync-conflicts/files/startup/client/src/components/base_components/master/baseMasterPropTypes.js.conflict` |
| `startup/client/src/components/base_components/master/bulk_actions/useMasterApproval.js` | modified on both sides | `23830825217d` | `sync-conflicts/files/startup/client/src/components/base_components/master/bulk_actions/useMasterApproval.js.conflict` |
| `startup/client/src/components/base_components/master/useMasterRows.js` | added on both sides | `23830825217d` | `sync-conflicts/files/startup/client/src/components/base_components/master/useMasterRows.js.conflict` |
| `startup/client/src/hooks/hasPermission.js` | modified on both sides | `04fef93ab93a` | `sync-conflicts/files/startup/client/src/hooks/hasPermission.js.conflict` |
| `startup/server/src/models/NamingSeries.js` | modified on both sides | `288520e9d87c` | `sync-conflicts/files/startup/server/src/models/NamingSeries.js.conflict` |
| `app/server/src/data/registerAppData.js` | modified on both sides | `92a0b0ea76df` | `sync-conflicts/files/app/server/src/data/registerAppData.js.conflict` |
