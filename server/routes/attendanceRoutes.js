const express    = require("express");
const Attendance = require("../models/Attendance");
const Worker     = require("../models/Worker");
const auth       = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(auth);

// GET /api/attendance?date=YYYY-MM-DD&workerId=<id>
// Manager: query any combination. Worker: handled by /my instead.
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.date)     filter.date     = req.query.date;
    if (req.query.workerId) filter.workerId = req.query.workerId;
    const records = await Attendance.find(filter)
      .populate("workerId", "name trade assignedProject")
      .sort({ date: -1, checkIn: 1 });
    res.json(records);
  } catch {
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

// GET /api/attendance/my — worker's own records (resolved from JWT)
router.get("/my", async (req, res) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) return res.status(404).json({ message: "No worker record linked to this account" });
    const records = await Attendance.find({ workerId: worker._id }).sort({ date: -1 }).limit(60);
    res.json(records);
  } catch {
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

// POST /api/attendance/checkin — worker self-check-in
router.post("/checkin", async (req, res) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) return res.status(404).json({ message: "No worker record linked to this account" });

    const today = new Date().toISOString().split("T")[0];
    const existing = await Attendance.findOne({ workerId: worker._id, date: today });
    if (existing) {
      return res.status(409).json({ message: "Already checked in today", record: existing });
    }

    const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const record = await Attendance.create({
      workerId:    worker._id,
      date:        today,
      checkIn:     timeStr,
      status:      "Present",
      project:     worker.assignedProject || "",
      submittedBy: "self",
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: "Failed to check in", error: error.message });
  }
});

// PUT /api/attendance/:id/checkout — worker self-check-out
router.put("/:id/checkout", async (req, res) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) return res.status(404).json({ message: "No worker record linked to this account" });

    const record = await Attendance.findOne({ _id: req.params.id, workerId: worker._id });
    if (!record) return res.status(404).json({ message: "Attendance record not found" });
    if (record.checkOut) return res.status(409).json({ message: "Already checked out" });

    const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const [inH, inM]   = record.checkIn.split(":").map(Number);
    const [outH, outM] = timeStr.split(":").map(Number);
    const hoursWorked  = Math.max(0, Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 6) / 10);

    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      { checkOut: timeStr, hoursWorked },
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(500).json({ message: "Failed to check out" });
  }
});

// POST /api/attendance — manager logs attendance for a specific worker
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const record = await Attendance.create(req.body);
    const populated = await record.populate("workerId", "name trade");
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: "Failed to create attendance record", error: error.message });
  }
});

// PUT /api/attendance/:id — manager updates a record
router.put("/:id", requireRole("manager"), async (req, res) => {
  try {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Record not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update attendance", error: error.message });
  }
});

// DELETE /api/attendance/:id — manager only
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    const deleted = await Attendance.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Attendance record deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete attendance record" });
  }
});

module.exports = router;
