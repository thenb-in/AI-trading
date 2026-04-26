const logger = require('../../logger');
const activityService = require('../services/activityService');
const {
  normalizeRecord,
  getActivityType,
  getObjectId,
  getActivityMessage,
  buildLogPayloadForAction
} = require('./activityLogUtils');

/**
 * Lowest-level generic activity log middleware factory.
 * It captures the response body and then writes a normalized activity record
 * using the shared activityService, only after the response has been sent
 * successfully (2xx).
 */
const createActivityLogger = ({
  objectName,
  action,
  buildHead = null,
  buildLogPayload = null
}) => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      if (!user) {
        logger.warn(`Activity logger used without authenticated user for ${objectName} ${action}`);
      }

      const originalJson = res.json.bind(res);
      let responseBody;

      // Intercept res.json to capture the response payload
      res.json = body => {
        responseBody = body;
        res.json = originalJson;
        return originalJson(body);
      };

      res.on('finish', async () => {
        try {
          // Only log successful operations (2xx)
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return;
          }

          const createdBy = user ? user.id : null;
          const companyId = user ? user.company_id : null;

          const rawData = responseBody && Object.prototype.hasOwnProperty.call(responseBody, 'data')
            ? responseBody.data
            : responseBody;

          const head = typeof buildHead === 'function'
            ? buildHead({ req, user, action, objectName, data: rawData })
            : objectName;

          const beforeData = res.locals && res.locals.activityBefore
            ? res.locals.activityBefore
            : (action === 'DELETE' ? normalizeRecord(rawData) : null);

          let afterData;
          if (action === 'UPDATE' && req && req.body && typeof req.body === 'object') {
            afterData = req.body;
          } else if (action === 'DELETE') {
            afterData = null;
          } else {
            afterData = rawData;
          }

          if (afterData && !Array.isArray(afterData)) {
            afterData = normalizeRecord(afterData);
          }

          const beforeKeys = beforeData && typeof beforeData === 'object' ? Object.keys(beforeData) : [];
          const afterKeys = afterData && typeof afterData === 'object' ? Object.keys(afterData) : [];
          logger.info(
            `[ActivityLog] Prepared before/after for logging action=${action} objectName=${objectName} beforeKeys=${beforeKeys.join(
              ','
            )} afterKeys=${afterKeys.join(',')}`
          );

          const hasExplicitObjectId =
            res.locals &&
            res.locals.activityObjectId !== null &&
            res.locals.activityObjectId !== undefined;

          const objectId = hasExplicitObjectId
            ? String(res.locals.activityObjectId)
            : getObjectId(afterData, req);
          const activityType = getActivityType(action);
          const message = getActivityMessage(objectName, action);

          const logPayload =
            action === 'UPDATE' &&
            res.locals &&
            res.locals.activityChanges &&
            Object.keys(res.locals.activityChanges).length > 0
              ? {
                action,
                changes: res.locals.activityChanges
              }
              : buildLogPayloadForAction({
                action,
                objectName,
                beforeData,
                afterData,
                buildLogPayload,
                req,
                user
              });

          await activityService.createActivity(
            head,
            JSON.stringify(logPayload),
            message,
            objectId,
            createdBy,
            companyId,
            activityType
          );
        } catch (error) {
          logger.error(`Error creating activity log for ${objectName} ${action}`, error);
        }
      });

      return next();
    } catch (error) {
      logger.error(`Activity logger middleware error for ${objectName} ${action}`, error);
      return next();
    }
  };
};

/**
 * High-level helper you can use for ANY route.
 *
 * Example:
 *   const employeeCreateLog = createStandardActivityLogger({
 *     objectName: 'Employee',
 *     action: 'CREATE'
 *   });
 */
const createStandardActivityLogger = ({
  objectName,
  action
}) => {
  const buildHead = () => objectName;

  return createActivityLogger({
    objectName,
    action,
    buildHead
  });
};

module.exports = {
  createActivityLogger,
  createStandardActivityLogger
};

