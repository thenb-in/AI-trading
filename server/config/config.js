const env = require('./env');

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL', 
    dialect: env.DB_DIALECT, 
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: env.DB_DIALECT,
  },
};
