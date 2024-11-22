// routes/authRoutes.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// User Registration Route
router.post("/register", authController.register);

// User Login Route
router.post("/login", authController.login);

// Admin Login Route
router.post("/admin/login", authController.loginAdmin);

// Password Reset Request Route
router.post("/request-password-reset", authController.requestPasswordReset);

// Password Reset Route
router.post("/reset-password", authController.resetPassword);

// Serve Reset Password Page (HTML form)
router.get("/reset-password", authController.resetPasswordPage);

// Email Verification Route
router.get("/verify-email", authController.verifyEmail);

// Admin Promotion Route (only for existing users)
router.post("/promote-to-admin", authController.promoteToAdmin);

module.exports = router;
