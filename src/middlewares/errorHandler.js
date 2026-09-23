const AppError = require("../utils/appError");

/**
 * Handle Mongoose CastError (e.g. invalid ObjectId format)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate key error (code 11000)
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  const value = err.keyValue ? err.keyValue[field] : "";
  const message = `Duplicate value for '${field}': '${value}'. Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose schema validation errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  const message = `Invalid input data: ${errors.map((e) => e.message).join(". ")}`;
  return new AppError(message, 422, errors);
};

/**
 * Handle Malformed JSON payload syntax error
 */
const handleSyntaxError = (err) => {
  return new AppError("Malformed JSON in request body.", 400);
};

/**
 * Global Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode || 500;

  // Specific database and format error handling
  if (err.name === "CastError") error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === "ValidationError") error = handleValidationErrorDB(err);
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    error = handleSyntaxError(err);
  }

  // Response construction
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message || "Internal server error occurred",
  };

  if (error.details) {
    response.errors = error.details;
  }

  if (process.env.NODE_ENV === "development" && !error.isOperational) {
    response.stack = err.stack;
    console.error("[Unhandled Error]:", err);
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
