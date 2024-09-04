// Handle custom errors
exports.handleCustomErrors = (err, req, res, next) => {
    if (err.custom) {
      res.status(err.status || 400).send({ error: err.message });
    } else {
      next(err);
    }
  };
  
  // Handle internal server errors
  exports.handle500errors = (err, req, res, next) => {
    res.status(500).send({ error: 'Internal Server Error', message: err.message });
  };
  
  