import { ApiError } from '../utils/apiError.js';

const notFound = (req, res, next) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = `Resource not found (Invalid ${err.path}: ${err.value})`;
  }
  
  if (err.code === 11000) {
      const value = Object.keys(err.keyValue)[0];
      message = `Duplicate field value entered for: ${value}. Please use another value.`;
      statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };