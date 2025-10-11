const errorMiddleware = (error, req, res) => {
  const status = error.status || 500;
  const payload = {
    error: error.message || 'Internal Server Error'
  };
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json(payload);
};

module.exports = errorMiddleware;
