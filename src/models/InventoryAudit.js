const mongoose = require("mongoose");

const inventoryAuditSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["RESTOCK", "SALE", "CANCELLATION_RESTORE", "MANUAL_ADJUSTMENT"],
      required: true,
      index: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referenceId: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const InventoryAudit = mongoose.model("InventoryAudit", inventoryAuditSchema);

module.exports = InventoryAudit;
