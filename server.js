const app = require("./src/app");
const { connectDB, disconnectDB } = require("./src/config/db");
const env = require("./src/config/env");
const seedData = require("./scripts/seed");

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    await seedData(false);

    const server = app.listen(env.port, () => {
      console.log("\n=========================================================");
      console.log(`🚀 E-Commerce & Inventory Backend Server is running!`);
      console.log(`📡 URL: http://localhost:${env.port}`);
      console.log(`📖 Swagger API Docs: http://localhost:${env.port}/api/docs`);
      console.log(`🩺 Health Check: http://localhost:${env.port}/api/health`);
      console.log(`⚙️  Environment: ${env.nodeEnv}`);
      console.log("=========================================================\n");
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log("[Server] HTTP server closed.");
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown after 10s if graceful fails
      setTimeout(() => {
        console.error("[Server] Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("[Server] Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
