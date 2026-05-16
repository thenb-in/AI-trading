
const logger = require('../server/logger');

// Cron expression: '0 1 * * *' = Every day at 1:00 AM
// Format: second minute hour day month weekday


// After: Simple executable function for system cron
async function runDailyReports() {
  logger.info(`Daily report execution started. isoDate: ${new Date().toISOString()}`);

  try {
    // call here ur jobs
    logger.info(`Daily report execution completed successfully. isoDate: ${new Date().toISOString()}`);
    process.exit(0); // Exit with success code
  } catch (error) {
    logger.error(`Daily report execution failed: ${error.message} - stack: ${error.stack}`);
    process.exit(1); // Exit with error code
  }
}

// Execute immediately when script is run
runDailyReports();
