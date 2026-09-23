const mongoose = require("mongoose");
const env = require("./env");

let memoryServer = null;

// Disable Mongoose command buffering globally so DB operations fail fast with descriptive errors instead of hanging 10s
mongoose.set("bufferCommands", false);

/**
 * Connect to MongoDB with automatic in-memory fallback for immediate zero-config testing.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let connectionUri = env.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;

  if (connectionUri) {
    try {
      console.log("[Database] Connecting to MongoDB instance...");
      const conn = await mongoose.connect(connectionUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`[Database] External MongoDB connection error: ${error.message}`);
    }
  }

  // If no external URI or external URI failed, try in-memory server
  if (!memoryServer) {
    console.log("[Database] Initializing in-memory MongoDB server...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      memoryServer = await MongoMemoryServer.create();
      const fallbackUri = memoryServer.getUri();
      const conn = await mongoose.connect(fallbackUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[Database] In-memory MongoDB running at: ${fallbackUri}`);
      return conn;
    } catch (err) {
      console.warn("[Database] In-memory MongoMemoryServer unavailable in serverless environment:", err.message);
    }
  }

  return mongoose.connection.readyState === 1 ? mongoose.connection : null;
};

/**
 * Gracefully disconnect and stop in-memory server if running.
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    console.log("[Database] MongoDB disconnected cleanly.");
  } catch (err) {
    console.error("[Database] Error disconnecting DB:", err.message);
  }
};

module.exports = { connectDB, disconnectDB };
