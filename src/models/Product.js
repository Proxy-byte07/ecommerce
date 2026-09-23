const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, "Product SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [120, "Title cannot exceed 120 characters"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
      index: true,
    },
    minStockThreshold: {
      type: Number,
      min: [0, "Threshold cannot be negative"],
      default: 5,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "archived"],
        message: "Status must be either 'active' or 'archived'",
      },
      default: "active",
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: inStock
productSchema.virtual("isInStock").get(function () {
  return this.stockQuantity > 0;
});

// Virtual: isLowStock
productSchema.virtual("isLowStock").get(function () {
  return this.stockQuantity <= this.minStockThreshold;
});

// Text index for search across title, description, and tags
productSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  sku: "text",
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
