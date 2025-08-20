require('dotenv').config(); 

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL', 
    dialect: process.env.DB_DIALECT || 'postgres', 
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: process.env.DB_DIALECT || 'postgres',
  },
};
