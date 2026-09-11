// sequelize-cli config (migrations). DATABASE_URL carries the dialect in its
// scheme, so the runtime connection derives it and this literal only satisfies
// the CLI's static config shape — there is no DB_DIALECT env to read.
const { POSTGRES_DIALECT } = require('../constants/database');

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: POSTGRES_DIALECT
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: POSTGRES_DIALECT
  }
};
