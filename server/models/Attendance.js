const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    workerId:    { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    projectId:   { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    date:        { type: String, required: true },  // "YYYY-MM-DD"
    checkIn:     { type: String, default: "" },     // "HH:MM"
    checkOut:    { type: String, default: "" },
    hoursWorked: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Half Day"],
      default: "Present",
    },
    project:     { type: String, default: "" },  // display name alongside ref
    notes:       { type: String, default: "" },
    submittedBy: { type: String, enum: ["self", "manager"], default: "self" },
  },
  { timestamps: true }
);

// Prevent duplicate check-in per worker per day
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });
// Efficient "who checked in today?" query
attendanceSchema.index({ date: 1 });
// Worker's own history sorted by date
attendanceSchema.index({ workerId: 1, createdAt: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
