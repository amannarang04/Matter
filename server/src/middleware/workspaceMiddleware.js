import { ValidationError } from '../utils/errors.js';

// Strict UUID regex (UUID v1-v5, case-insensitive)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function workspaceMiddleware(req, res, next) {
  const workspaceIdHeader = req.headers['x-workspace-id'];

  if (!workspaceIdHeader || typeof workspaceIdHeader !== 'string') {
    return next(
      new ValidationError('Missing or invalid X-Workspace-Id header (must be a valid UUID)', [
        {
          field: 'X-Workspace-Id',
          message: 'Missing required X-Workspace-Id header',
        },
      ])
    );
  }

  const trimmed = workspaceIdHeader.trim();
  if (!UUID_REGEX.test(trimmed)) {
    return next(
      new ValidationError('Missing or invalid X-Workspace-Id header (must be a valid UUID)', [
        {
          field: 'X-Workspace-Id',
          message: `Invalid workspace ID "${trimmed}". Value must be a valid RFC 4122 UUID`,
        },
      ])
    );
  }

  req.workspaceId = trimmed.toLowerCase();
  next();
}
