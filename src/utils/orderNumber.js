const crypto = require("crypto");

/**
 * Generate a clean, human-readable order number.
 * Format: ORD-YYYYMMDD-XXXXX
 * Example: ORD-20260922-A8F3D
 */
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
};

module.exports = { generateOrderNumber };
