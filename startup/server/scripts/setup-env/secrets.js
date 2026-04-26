const logger = require('../../logger');
const { generateSecret } = require('./utils');

function generateSecrets() {
  logger.info('🔐 Generating secure JWT secrets...');

  const accessSecret = generateSecret();
  const refreshSecret = generateSecret();

  logger.info('✅ Generated JWT secrets:');
  logger.info(`JWT_SECRET=${accessSecret}`);
  logger.info(`REFRESH_TOKEN_SECRET=${refreshSecret}`);
  logger.info('💡 Copy these to your .env file!');

  return { accessSecret, refreshSecret };
}

module.exports = {
  generateSecrets
};

