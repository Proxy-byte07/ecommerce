const app = require("../src/app");
const { connectDB } = require("../src/config/db");
const seedData = require("../scripts/seed");

let isSeeded = false;

module.exports = async (req, res) => {
  try {
    const conn = await connectDB();
    if (conn && conn.readyState === 1 && !isSeeded) {
      await seedData(false);
      isSeeded = true;
    }
  } catch (err) {
    console.error("[Vercel Handler] Connection/Seed Error:", err.message);
  }
  return app(req, res);
};
