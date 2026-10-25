export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || [];

  if (statusCode === 500 && process.env.NODE_ENV !== 'test') {
    console.error('Server Error:', err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
}
