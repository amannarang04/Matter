export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (typeof err.status === 'number' ? err.status : 500);
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');

  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction && statusCode === 500
    ? 'Internal Server Error'
    : (err.message || 'An unexpected error occurred');

  let details = Array.isArray(err.details) ? err.details : [];
  if (isProduction) {
    details = details.map((d) => {
      if (d && typeof d === 'object') {
        const { stack, ...safeDetail } = d;
        return safeDetail;
      }
      return d;
    });
  }

  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
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
