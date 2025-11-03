const logger = require('../../logger');

function showSetupInstructions() {
  logger.info('📋 Environment Setup Instructions:');
  logger.debug('1. Copy .env.example to .env:');
  logger.debug('   cp .env.example .env');
  logger.info('2. Update .env with your values:');
  logger.debug('   - Set DATABASE_URL to your PostgreSQL connection string');
  logger.debug('   - Generate and set JWT_SECRET and REFRESH_TOKEN_SECRET');
  logger.debug('   - Update FRONTEND_URL to match your frontend server');
  logger.info('3. Generate JWT secrets:');
  logger.debug('   npm run generate-secrets');
  logger.info('4. Validate environment:');
  logger.debug('   npm run validate-env');
}

module.exports = {
  showSetupInstructions
};

