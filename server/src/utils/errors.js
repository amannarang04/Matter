export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR', details = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ExecutionError extends AppError {
  constructor(message, details = []) {
    super(message, 500, 'EXECUTION_ERROR', details);
  }
}

export function getNodeLabel(node) {
  if (node?.data?.label && typeof node.data.label === 'string' && node.data.label.trim()) {
    return node.data.label.trim();
  }
  return (node?.id) ? String(node.id) : 'unknown';
}

export function formatNodeError(node, message) {
  const label = getNodeLabel(node);
  const type = node?.type || 'unknown';
  return `Node "${label}" (${type}): ${message}`;
}
