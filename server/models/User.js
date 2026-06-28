const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName:        { type: String, required: true, trim: true },
    lastName:         { type: String, required: true, trim: true },
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passhash:         { type: String, required: true },   // bcrypt hash — no transforms
    role:             { type: String, enum: ["manager", "worker"], default: "manager" },
    company:          { type: String, trim: true, default: "" },
    resetToken:       { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
