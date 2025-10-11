const { Pool } = require('pg');
const config = require('./env.config');

let pool;

const getPool = () => {
  if (!config.databaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000
    });
  }
  return pool;
};

const checkConnection = async () => {
  const currentPool = getPool();
  if (!currentPool) {
    return { status: 'skipped', detail: 'DATABASE_URL not configured' };
  }
  try {
    await currentPool.query('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', detail: error.message };
  }
};

module.exports = {
  getPool,
  checkConnection
};
