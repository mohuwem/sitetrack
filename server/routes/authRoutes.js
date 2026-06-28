const express  = require("express");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const crypto    = require("crypto");
const User      = require("../models/User");
const Worker    = require("../models/Worker");
const authMiddleware = require("../middleware/auth");

const rateLimit = require("express-rate-limit");
const { sendPasswordResetEmail } = require("../utils/email");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

const normalizeRole = (role) => (role === "worker" ? "worker" : "manager");

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: normalizeRole(user.role) },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const safeUser = (user) => ({
  id:        user._id,
  firstName: user.firstName,
  lastName:  user.lastName,
  email:     user.email,
  role:      normalizeRole(user.role),
  company:   user.company,
});

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  const assignedRole = role === "worker" ? "worker" : "manager";
  try {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "An account with this email already exists" });

    const passhash = await bcrypt.hash(password, 12);
    const user     = await User.create({ firstName, lastName, email, passhash, role: assignedRole });

    // Auto-link: if a Worker record already exists with this email, bind it to the new account
    if (assignedRole === "worker") {
      const emailLower = email.toLowerCase();
      await Worker.findOneAndUpdate(
        { email: { $regex: new RegExp(`^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }, userId: null },
        { userId: user._id }
      );
    }

    const token = signToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to create account", error: error.message });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.passhash);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// GET /api/auth/me — verify token + return current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passhash -resetToken -resetTokenExpiry");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// PUT /api/auth/profile — update display name and company (role is set at registration, not self-editable)
router.put("/profile", authMiddleware, async (req, res) => {
  const { firstName, lastName, company } = req.body;
  try {
    const update = {};
    if (firstName !== undefined) update.firstName = firstName.trim();
    if (lastName  !== undefined) update.lastName  = lastName.trim();
    if (company   !== undefined) update.company   = company.trim();

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(safeUser(user));
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

// PUT /api/auth/change-password — change password while logged in
router.put("/change-password", authMiddleware, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  try {
    const passhash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.user.id, { passhash });
    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Failed to update password" });
  }
});

// POST /api/auth/reset-password — initiate reset: generates token and emails link
router.post("/reset-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const genericOk = { message: "If that email is registered, a reset link has been sent." };

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(genericOk);

    const resetToken       = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await User.findByIdAndUpdate(user._id, { resetToken, resetTokenExpiry });

    const resetLink = `${process.env.FRONTEND_URL}/update-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetLink);

    res.json(genericOk);
  } catch {
    res.status(500).json({ message: "Failed to initiate password reset" });
  }
});

// POST /api/auth/confirm-reset — set new password using token
router.post("/confirm-reset", async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  try {
    const user = await User.findOne({
      resetToken,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    const passhash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, { passhash, resetToken: null, resetTokenExpiry: null });
    res.json({ message: "Password reset successfully. You can now sign in." });
  } catch {
    res.status(500).json({ message: "Failed to reset password" });
  }
});

module.exports = router;
