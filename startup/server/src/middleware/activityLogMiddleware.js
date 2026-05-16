const { createStandardActivityLogger } = require('../activitylogs/activityLogger');

/**
 * Generic factory to create activity log middleware for any single model/action.
 *
 * Usage in a route:
 *   const { createActivityLogMiddleware } = require('../middleware/activityLogMiddleware');
 *   const employeeCreateLog = createActivityLogMiddleware('Employee', 'CREATE');
 */
const createActivityLogMiddleware = (objectName, action) =>
  createStandardActivityLogger({ objectName, action });

/**
 * Helper to generate common CRUD activity middlewares for one model.
 *
 * Usage in a route file:
 *   const { createCrudActivityLogs } = require('../middleware/activityLogMiddleware');
 *   const employeeLogs = createCrudActivityLogs('Employee');
 *
 *   router.post('/',  protect, employeeLogs.create, employeeController.create);
 *   router.put('/:id', protect, employeeLogs.update, employeeController.update);
 *   router.delete('/:id', protect, employeeLogs.delete, employeeController.delete);
 */
const createCrudActivityLogs = (objectName) => ({
  create: createStandardActivityLogger({ objectName, action: 'CREATE' }),
  update: createStandardActivityLogger({ objectName, action: 'UPDATE' }),
  delete: createStandardActivityLogger({ objectName, action: 'DELETE' })
});

module.exports = {
  createActivityLogMiddleware,
  createCrudActivityLogs
};

