const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/appError");
const env = require("../config/env");

/**
 * Generate signed JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};

/**
 * Register a new user
 */
const registerUser = async ({ name, email, password, role, address }) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError("An account with this email address already exists.", 409);
  }

  // Create new user (role defaults to 'customer' if not provided)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: role || "customer",
    address: address || {},
  });

  const token = generateToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      createdAt: user.createdAt,
    },
    token,
  };
};

/**
 * Authenticate user and return JWT
 */
const loginUser = async ({ email, password }) => {
  // Find user and explicitly select password field
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated. Please contact support.", 403);
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError("Invalid email or password.", 401);
  }

  const token = generateToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      createdAt: user.createdAt,
    },
    token,
  };
};

/**
 * Get user profile by ID
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }
  return user;
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  generateToken,
};
