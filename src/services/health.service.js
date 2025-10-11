const config = require('../config/env.config');
const db = require('../config/db.config');

const getHealthStatus = async () => {
  const database = await db.checkConnection();
  return {
    status: 'ok',
    environment: config.nodeEnv,
    database
  };
};

module.exports = {
  getHealthStatus
};
