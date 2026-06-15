// todo: not being used for now. we are currently using npm run dev and starting the server manually.
// todo: have this to setup the server from scratch using npm run i for CICD

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.TEST_DB_HOST,
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME,
  user: process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASSWORD,
});

console.log('Database connection pool created');

export async function closeConnection() {
  await pool.end();
}

export default pool;