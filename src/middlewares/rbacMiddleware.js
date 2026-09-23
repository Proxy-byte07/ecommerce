const AppError = require("../utils/appError");

/**
 * Role-Based Access Control (RBAC) middleware.
 * Restricts access to routes based on user role.
 *
 * @param  {...String} allowedRoles - E.g. 'admin', 'customer'
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError("User context not found. Ensure auth middleware runs before authorize.", 500)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: You do not have permission to perform this action. Required role(s): [${allowedRoles.join(", ")}]. Current role: '${req.user.role}'`,
          403
        )
      );
    }

    next();
  };
};

module.exports = authorize;
