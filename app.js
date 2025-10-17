const express = require('express');
const helmet = require('helmet');

const config = require('./src/config/env.config');
const appInsightsService = require('./src/services/appInsightsService');
const logger = require('./src/middlewares/logger.middleware');
const errorHandler = require('./src/middlewares/error.middleware');
const healthService = require('./src/services/health.service');
const authRoutes = require('./src/routes/auth.route');
const chatRoutes = require('./src/routes/chat.route');
const caseRoutes = require('./src/routes/case.route');
const taskRoutes = require('./src/routes/task.route');
const referralRoutes = require('./src/routes/referral.route');
const doctorRoutes = require('./src/routes/doctor.route');

appInsightsService.setup();

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(logger);
app.use(require('./src/middlewares/sanitize.middleware'));

app.get('/healthz', async (req, res, next) => {
  try {
    const status = await healthService.getHealthStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/cases', taskRoutes);
app.use('/cases', caseRoutes);
app.use('/referrals', referralRoutes);
app.use('/doctor', doctorRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const start = () => {
  const port = config.port || 3000;
  app.listen(port, () => console.log(`Breathy API listening on port ${port}`));
};

if (require.main === module) {
  start(); 
}

module.exports = app;
