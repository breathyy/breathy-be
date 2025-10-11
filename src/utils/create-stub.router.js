const express = require('express');

const createStubRouter = (name) => {
  const router = express.Router();
  router.use((req, res) => {
    res.status(501).json({ error: `${name} route not implemented` });
  });
  return router;
};

module.exports = createStubRouter;
