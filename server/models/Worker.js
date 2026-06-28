const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    issuedBy: String,
    issueDate: String,
    expiryDate: String,
  },
  { _id: false }
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    id: String,
    date: String,
    checkIn: String,
    checkOut: String,
    hoursWorked: Number,
    status: { type: String, enum: ["Present", "Absent", "Late", "Half Day"] },
    project: String,
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    id: String,
    author: String,
    message: String,
    createdAt: String,
  },
  { _id: false }
);

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    employeeId: { type: String, trim: true, default: "" },
    trade: { type: String, trim: true, default: "" },
    skills: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Off Duty", "Terminated"],
      default: "Active",
    },
    assignedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    assignedProject:   { type: String, trim: true, default: "" },
    startDate: { type: String },
    emergencyContactName: { type: String, trim: true, default: "" },
    emergencyContactPhone: { type: String, trim: true, default: "" },
    certifications: { type: [certificationSchema], default: [] },
    attendance: { type: [attendanceRecordSchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    avatarInitials: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", workerSchema);
