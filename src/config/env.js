const dotenv = require("dotenv");
const path = require("path");

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "../../.env") });

const env = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "default_jwt_secret_dev_key_only",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

module.exports = env;
