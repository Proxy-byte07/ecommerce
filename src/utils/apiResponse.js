/**
 * Standardized API Response Helpers.
 */
class ApiResponse {
  /**
   * Send a successful response.
   * @param {Object} res - Express response object
   * @param {Number} statusCode - HTTP status code (default 200)
   * @param {String} message - Human-readable success message
   * @param {*} data - Response payload
   * @param {Object|null} meta - Optional pagination or metadata
   */
  static success(res, statusCode = 200, message = "Success", data = null, meta = null) {
    const responsePayload = {
      success: true,
      message,
    };

    if (data !== null && data !== undefined) {
      responsePayload.data = data;
    }

    if (meta !== null && meta !== undefined) {
      responsePayload.meta = meta;
    }

    return res.status(statusCode).json(responsePayload);
  }

  /**
   * Send an error response.
   * @param {Object} res - Express response object
   * @param {Number} statusCode - HTTP status code
   * @param {String} message - Error message
   * @param {*} errors - Validation errors or details
   */
  static error(res, statusCode = 500, message = "An error occurred", errors = null) {
    const responsePayload = {
      success: false,
      message,
    };

    if (errors !== null && errors !== undefined) {
      responsePayload.errors = errors;
    }

    return res.status(statusCode).json(responsePayload);
  }
}

module.exports = ApiResponse;
