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
