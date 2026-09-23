const { validationResult } = require("express-validator");
const ApiResponse = require("../utils/apiResponse");

/**
 * Middleware to check express-validator validation results.
 * Formats errors and returns 400 Bad Request if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return ApiResponse.error(
      res,
      400,
      "Validation failed. Please verify input parameters.",
      formattedErrors
    );
  }
  next();
};

module.exports = validate;
