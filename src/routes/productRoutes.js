const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/rbacMiddleware");
const validate = require("../middlewares/validateMiddleware");
const {
  createProductValidator,
  updateProductValidator,
  getProductsQueryValidator,
  mongoIdParamValidator,
} = require("../validators/productValidator");

// Public endpoints
router.get("/", getProductsQueryValidator, validate, productController.getProducts);
router.get("/:id", mongoIdParamValidator, validate, productController.getProductById);

// Admin-only endpoints
router.post(
  "/",
  authenticate,
  authorize("admin"),
  createProductValidator,
  validate,
  productController.createProduct
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateProductValidator,
  validate,
  productController.updateProduct
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  mongoIdParamValidator,
  validate,
  productController.archiveProduct
);

module.exports = router;
