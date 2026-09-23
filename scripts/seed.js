const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../src/config/db");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Cart = require("../src/models/Cart");
const Order = require("../src/models/Order");
const InventoryAudit = require("../src/models/InventoryAudit");

const seedData = async (forceClear = true) => {
  try {
    console.log("Connecting to database for seeding...");
    await connectDB();

    if (!forceClear) {
      const count = await User.countDocuments();
      if (count > 0) {
        return;
      }
      console.log("Database is empty. Running automatic seed setup...");
    } else {
      console.log("Clearing existing collections...");
      await Promise.all([
        User.deleteMany({}),
        Product.deleteMany({}),
        Cart.deleteMany({}),
        Order.deleteMany({}),
        InventoryAudit.deleteMany({}),
      ]);
    }

    console.log("Seeding users...");
    // 1. Seed Users (password hashing handled by pre-save hook)
    const admin = await User.create({
      name: "System Administrator",
      email: "admin@ecommerce.com",
      password: "AdminSecret123!",
      role: "admin",
      address: {
        street: "100 Admin Plaza",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
        country: "US",
      },
    });

    const customer = await User.create({
      name: "Jane Shopper",
      email: "customer@ecommerce.com",
      password: "CustomerSecret123!",
      role: "customer",
      address: {
        street: "742 Evergreen Terrace",
        city: "Springfield",
        state: "OR",
        zipCode: "97477",
        country: "US",
      },
    });

    console.log("Seeding products...");
    // 2. Seed Realistic Products
    const productsData = [
      {
        sku: "TECH-HEAD-001",
        title: "Wireless ANC Over-Ear Headphones",
        description: "Studio-grade wireless headphones with hybrid active noise cancellation, transparency mode, and 40-hour battery life.",
        price: 199.99,
        category: "electronics",
        stockQuantity: 45,
        minStockThreshold: 5,
        tags: ["audio", "bluetooth", "noise-cancelling"],
      },
      {
        sku: "TECH-KEY-002",
        title: "Mechanical Tenkeyless Gaming Keyboard",
        description: "Hot-swappable tactile mechanical keyboard with custom RGB backlighting and PBT double-shot keycaps.",
        price: 89.99,
        category: "electronics",
        stockQuantity: 28,
        minStockThreshold: 5,
        tags: ["gaming", "keyboard", "rgb"],
      },
      {
        sku: "TECH-MOUSE-003",
        title: "Ultralight Wireless Gaming Mouse",
        description: "Ergonomic 58g gaming mouse with 26K DPI optical sensor and ultra-flexible paracord cable.",
        price: 59.99,
        category: "electronics",
        stockQuantity: 4, // Below threshold (Low stock!)
        minStockThreshold: 5,
        tags: ["gaming", "mouse", "wireless"],
      },
      {
        sku: "APPAREL-HOOD-001",
        title: "Heavyweight Cotton Fleece Hoodie",
        description: "Premium 450 GSM organic cotton oversized hoodie with ribbed cuffs and double-layered hood.",
        price: 65.0,
        category: "apparel",
        stockQuantity: 60,
        minStockThreshold: 10,
        tags: ["apparel", "hoodie", "cotton"],
      },
      {
        sku: "APPAREL-TEE-002",
        title: "Minimalist Crewneck T-Shirt 3-Pack",
        description: "Breathable 100% combed cotton everyday crewneck t-shirts in neutral earth tones.",
        price: 34.99,
        category: "apparel",
        stockQuantity: 2, // Low stock!
        minStockThreshold: 10,
        tags: ["apparel", "tshirt", "basics"],
      },
      {
        sku: "HOME-COFFEE-001",
        title: "Precision Pour-Over Coffee Kettle",
        description: "Matte black stainless steel gooseneck kettle with built-in analog thermometer for artisanal brew control.",
        price: 49.5,
        category: "home",
        stockQuantity: 18,
        minStockThreshold: 4,
        tags: ["coffee", "kitchen", "kettle"],
      },
      {
        sku: "HOME-ROASTER-002",
        title: "Cast Iron Dutch Oven 6-Quart",
        description: "Enameled cast iron dutch oven with superior heat retention and tight-fitting moisture lid.",
        price: 79.99,
        category: "home",
        stockQuantity: 12,
        minStockThreshold: 3,
        tags: ["cookware", "kitchen", "cast-iron"],
      },
      {
        sku: "FIT-MAT-001",
        title: "Eco-Friendly High-Density Yoga Mat",
        description: "Non-slip 6mm natural tree rubber yoga mat with alignment guide lines and carrying strap.",
        price: 42.0,
        category: "fitness",
        stockQuantity: 35,
        minStockThreshold: 5,
        tags: ["fitness", "yoga", "exercise"],
      },
      {
        sku: "FIT-BOTTLE-002",
        title: "Insulated Stainless Steel Water Bottle 32oz",
        description: "Double-wall vacuum insulated flask that keeps drinks cold for 24 hours or piping hot for 12 hours.",
        price: 24.99,
        category: "fitness",
        stockQuantity: 0, // Out of stock
        minStockThreshold: 5,
        tags: ["bottle", "hydration", "sports"],
      },
    ];

    const insertedProducts = await Product.insertMany(productsData);

    console.log("Generating initial inventory audit records...");
    const auditLogs = insertedProducts.map((p) => ({
      product: p._id,
      sku: p.sku,
      type: "RESTOCK",
      quantityChange: p.stockQuantity,
      previousStock: 0,
      newStock: p.stockQuantity,
      performedBy: admin._id,
      reason: "Initial seed catalog stock setup",
    }));

    await InventoryAudit.insertMany(auditLogs);

    console.log("\n=========================================================");
    console.log("✅ Seed Data Generated Successfully!");
    console.log("---------------------------------------------------------");
    console.log("Admin User:");
    console.log("  Email:    admin@ecommerce.com");
    console.log("  Password: AdminSecret123!");
    console.log("  Role:     admin");
    console.log("---------------------------------------------------------");
    console.log("Customer User:");
    console.log("  Email:    customer@ecommerce.com");
    console.log("  Password: CustomerSecret123!");
    console.log("  Role:     customer");
    console.log("---------------------------------------------------------");
    console.log(`Products Seeded: ${insertedProducts.length} items`);
    console.log("=========================================================\n");

    if (require.main === module) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    if (require.main === module) {
      await disconnectDB();
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = seedData;
