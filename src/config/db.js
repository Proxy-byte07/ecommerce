const mongoose = require("mongoose");
const env = require("./env");

let memoryServer = null;

/**
 * Connect to MongoDB with automatic in-memory fallback for immediate zero-config testing.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let connectionUri = env.mongoUri;

  if (!connectionUri) {
    console.log("[Database] No MONGODB_URI provided. Initializing in-memory MongoDB server...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      memoryServer = await MongoMemoryServer.create();
      connectionUri = memoryServer.getUri();
      console.log(`[Database] In-memory MongoDB running at: ${connectionUri}`);
    } catch (err) {
      console.error("[Database] Failed to launch in-memory MongoDB:", err.message);
      throw err;
    }
  }

  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host || "in-memory"}`);
    return conn;
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    // If external URI failed, try in-memory fallback in dev mode
    if (env.mongoUri && !memoryServer && env.nodeEnv === "development") {
      console.log("[Database] External MongoDB connection failed. Attempting in-memory fallback...");
      try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        memoryServer = await MongoMemoryServer.create();
        const fallbackUri = memoryServer.getUri();
        const conn = await mongoose.connect(fallbackUri);
        console.log(`[Database] In-memory fallback connected at: ${fallbackUri}`);
        return conn;
      } catch (fallbackErr) {
        console.error("[Database] In-memory fallback also failed:", fallbackErr.message);
        throw fallbackErr;
      }
    }
    throw error;
  }
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
