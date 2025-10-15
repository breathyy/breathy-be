const appInsights = require('applicationinsights');
const config = require('../config/env.config');

let client;
let initialized = false;

const setup = () => {
  if (initialized) {
    return client;
  }
  if (!config.appInsightsConnectionString) {
    initialized = true;
    return null;
  }
  appInsights
    .setup(config.appInsightsConnectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI);
  appInsights.defaultClient.config.samplingPercentage = config.nodeEnv === 'production' ? 100 : 25;
  appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'breathy-api';
  appInsights.start();
  client = appInsights.defaultClient;
  initialized = true;
  return client;
};

const getClient = () => {
  if (!initialized) {
    return setup();
  }
  return client;
};

const trackTrace = (message, properties) => {
  const telemetryClient = getClient();
  if (telemetryClient && message) {
    telemetryClient.trackTrace({ message, properties: properties || {} });
  }
};

const trackMetric = (name, value, properties) => {
  const telemetryClient = getClient();
  if (telemetryClient && typeof value === 'number') {
    telemetryClient.trackMetric({ name, value, properties: properties || {} });
  }
};

const trackException = (error, properties) => {
  const telemetryClient = getClient();
  if (telemetryClient && error) {
    telemetryClient.trackException({ exception: error, properties: properties || {} });
  }
};

const flush = () => {
  const telemetryClient = getClient();
  if (telemetryClient) {
    telemetryClient.flush();
  }
};

module.exports = {
  setup,
  trackTrace,
  trackMetric,
  trackException,
  flush
};
