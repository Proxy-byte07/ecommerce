const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authenticate = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validateMiddleware");
const {
  registerValidator,
  loginValidator,
} = require("../validators/authValidator");

router.post("/register", registerValidator, validate, authController.register);
router.post("/login", loginValidator, validate, authController.login);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
