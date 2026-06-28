const express    = require("express");
const WorkLog    = require("../models/WorkLog");
const Worker     = require("../models/Worker");
const auth       = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(auth);

// GET /api/worklog?date=YYYY-MM-DD&workerId=<id>&limit=N
// Used by manager dashboard to fetch the recent update feed
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.date)     filter.date     = req.query.date;
    if (req.query.workerId) filter.workerId = req.query.workerId;
    const limit = parseInt(req.query.limit) || 20;
    const logs = await WorkLog.find(filter)
      .populate("workerId", "name trade assignedProject")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(logs);
  } catch {
    res.status(500).json({ message: "Failed to fetch work logs" });
  }
});

// GET /api/worklog/my — worker's own logs (resolved from JWT)
router.get("/my", async (req, res) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) return res.status(404).json({ message: "No worker record linked to this account" });
    const logs = await WorkLog.find({ workerId: worker._id })
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(logs);
  } catch {
    res.status(500).json({ message: "Failed to fetch work logs" });
  }
});

// POST /api/worklog — worker submits a daily update
router.post("/", async (req, res) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) return res.status(404).json({ message: "No worker record linked to this account" });

    const today = new Date().toISOString().split("T")[0];
    const log = await WorkLog.create({
      workerId:  worker._id,
      projectId: req.body.projectId || null,
      taskId:    req.body.taskId    || null,
      date:      req.body.date      || today,
      message:   req.body.message,
      blockers:  req.body.blockers  || "",
    });
    const populated = await log.populate("workerId", "name trade");
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: "Failed to create work log", error: error.message });
  }
});

// DELETE /api/worklog/:id — manager can remove a log
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    const deleted = await WorkLog.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Work log not found" });
    res.json({ message: "Work log deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete work log" });
  }
});

module.exports = router;
