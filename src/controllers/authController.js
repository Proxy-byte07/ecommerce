const authService = require("../services/authService");
const ApiResponse = require("../utils/apiResponse");

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, address } = req.body;
    const result = await authService.registerUser({
      name,
      email,
      password,
      role,
      address,
    });

    return ApiResponse.success(
      res,
      201,
      "User registered successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });

    return ApiResponse.success(res, 200, "Login successful", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged in user's profile
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user._id);
    return ApiResponse.success(res, 200, "User profile retrieved", { user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
