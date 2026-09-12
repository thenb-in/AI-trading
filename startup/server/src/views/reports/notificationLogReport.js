const logger = require('../../../logger');
const { getNotificationLogData } = require('../../controllers/reports/notificationLogReport');
const { get_notification_log_report_columns } = require('../../constants/columns/reports/notificationLogReport');
const { keepColumnData, processFilters } = require('../../utils/filterUtils');
const { sendSuccess, sendError } = require('../../utils/response');
const { HTTP_STATUS_INTERNAL_ERROR } = require('../../constants/http');
const { NOTIFICATION_LOG_REPORT } = require('../../constants/reports_names');

/**
 * Notification Log Report -- what the notification rules sent, and what became of it.
 */
async function getNotificationLogReport(req, res) {
  try {
    const filters = processFilters(req);
    const { rows, totals } = await getNotificationLogData(req.user, filters);
    const columns = get_notification_log_report_columns();
    const data = keepColumnData(rows, columns);

    return sendSuccess(res, {
      data: {
        data,
        columns,
        totals: { ...totals, matched: data.length }
      },
      message: `${NOTIFICATION_LOG_REPORT} fetched successfully, found ${data.length} deliveries`
    });
  } catch (error) {
    logger.error(`Error fetching ${NOTIFICATION_LOG_REPORT}. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to fetch ${NOTIFICATION_LOG_REPORT}. ${error.message}`
    });
  }
}

module.exports = { getNotificationLogReport };
