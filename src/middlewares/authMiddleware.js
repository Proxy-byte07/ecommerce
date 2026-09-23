const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const AppError = require("../utils/appError");

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header for Bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("Authentication required. Please provide a valid Bearer token.", 401)
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new AppError("Token has expired. Please log in again.", 401));
      }
      return next(new AppError("Invalid authentication token.", 401));
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    if (!user.isActive) {
      return next(
        new AppError("User account has been deactivated. Contact support.", 403)
      );
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
