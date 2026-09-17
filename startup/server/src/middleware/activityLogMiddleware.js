const { createStandardActivityLogger } = require('../activitylogs/activityLogger');

/**
 * Generic factory to create activity log middleware for any single model/action.
 *
 * Usage in a route:
 *   const { createActivityLogMiddleware } = require('../middleware/activityLogMiddleware');
 *   const geographyCreateLog = createActivityLogMiddleware('Geography', 'CREATE');
 */
const createActivityLogMiddleware = (objectName, action) =>
  createStandardActivityLogger({ objectName, action });

/**
 * Helper to generate common CRUD activity middlewares for one model.
 *
 * Usage in a route file:
 *   const { createCrudActivityLogs } = require('../middleware/activityLogMiddleware');
 *   const geographyLogs = createCrudActivityLogs('Geography');
 *
 *   router.post('/',  protect, geographyLogs.create, geographyController.create);
 *   router.put('/:id', protect, geographyLogs.update, geographyController.update);
 *   router.delete('/:id', protect, geographyLogs.delete, geographyController.delete);
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

