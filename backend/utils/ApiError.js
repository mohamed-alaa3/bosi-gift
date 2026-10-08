/**
 * Custom error class used across the app.
 * Controllers throw `new ApiError(message, statusCode, errors?)`.
 * The centralized errorHandler reads `.statusCode` and `.errors`.
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, errors = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad Request", errors) {
    return new ApiError(message, 400, errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(message, 401);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(message, 403);
  }

  static notFound(message = "Not Found") {
    return new ApiError(message, 404);
  }

  static conflict(message = "Conflict") {
    return new ApiError(message, 409);
  }

  static unprocessable(message = "Unprocessable Entity", errors) {
    return new ApiError(message, 422, errors);
  }

  static tooMany(message = "Too Many Requests") {
    return new ApiError(message, 429);
  }

  static internal(message = "Internal Server Error") {
    return new ApiError(message, 500);
  }
}

module.exports = ApiError;
