const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const env = require("./config/env");
const apiRoutes = require("./routes");
const { setupSwagger } = require("./docs/swagger");
const errorHandler = require("./middlewares/errorHandler");
const AppError = require("./utils/appError");

const path = require("path");

const app = express();

// ─── Global Middleware ──────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, "../public")));

if (env.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// Ignore favicon
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ─── Interactive Swagger Documentation ─────────────────────────────────────────
setupSwagger(app);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    message: "E-Commerce & Inventory Management API is operational",
    version: "1.0.0",
    environment: env.nodeEnv,
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Welcome / Index ───────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Intermediate E-Commerce & Inventory Management Backend API",
    documentation: "/api/docs",
    healthCheck: "/api/health",
    version: "1.0.0",
    modules: [
      { name: "Authentication", prefix: "/api/v1/auth" },
      { name: "Products", prefix: "/api/v1/products" },
      { name: "Inventory", prefix: "/api/v1/inventory" },
      { name: "Cart", prefix: "/api/v1/cart" },
      { name: "Orders", prefix: "/api/v1/orders" },
    ],
  });
});

// ─── Database Readiness Guard ─────────────────────────────────────────
app.use("/api/v1", (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database connection is not established. Please configure MONGODB_URI in your Vercel / Cloud Environment Settings (e.g. MongoDB Atlas connection URI) and verify Network Access IP is set to 0.0.0.0/0.",
      error: "DATABASE_DISCONNECTED",
      healthCheck: "/api/health",
    });
  }
  next();
});

// ─── Mount Domain API Routes ──────────────────────────────────────────────────
app.use("/api/v1", apiRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.all("*", (req, res, next) => {
  next(
    new AppError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server. Refer to /api/docs for available routes.`, 404)
  );
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
