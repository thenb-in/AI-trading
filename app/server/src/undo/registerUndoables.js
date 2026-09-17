// registerUndoables.js
//
// Which of the app's masters can be undone, and with which delete. Undo is not
// a second write path — the framework replays a batch by calling the delete a
// master already has, so registering one is a one-line decision made next to
// its routes. See @startup/src/undo/undoRegistry for what each option means.
//
// Empty in the reference scaffold: an app registers its own masters here.
//
//   const { registerUndoable } = require('@startup/src/undo/undoRegistry');
//   const { deleteManualAttendance, canRemoveManualAttendance } = require('../services/manualAttendanceService');
//
//   registerUndoable('ManualAttendance', {   // the activity head its routes log under
//     remove: deleteManualAttendance,        // the same delete the DELETE route uses
//     undoUpdateByDelete: true,              // changes undo by removing the record
//     canRemove: canRemoveManualAttendance   // ...unless approved or locked since
//   });

const logger = require('@startup/logger');

const registerUndoables = () => {
  logger.info(`App undoables registered at ${Date.now()}`);
};

module.exports = registerUndoables;
