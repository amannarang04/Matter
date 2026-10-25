import rateLimit from 'express-rate-limit';

/**
 * Conservative rate limiter on execution/retry endpoints:
 * 30 runs per 15 minutes per IP address.
 */
export const runLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many run requests from this IP. Please wait a few minutes before trying again.',
      details: [],
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});
