import rateLimit from 'express-rate-limit';

/**
 * Creates a rate limiter instance with configurable options.
 */
export function createRunLimiter(overrides = {}) {
  return rateLimit({
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
    ...overrides,
  });
}

/**
 * Conservative rate limiter on execution/retry endpoints:
 * 30 runs per 15 minutes per IP address.
 */
export const runLimiter = createRunLimiter();
