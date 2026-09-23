const app = require("../src/app");
const { connectDB } = require("../src/config/db");

// Cache the DB connection across serverless function invocations
let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error("Vercel DB Connection Error:", err);
    }
  }
  return app(req, res);
};
