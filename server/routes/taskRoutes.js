const express    = require("express");
const Task       = require("../models/Task");
const auth       = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(auth);

// GET /api/task?assigneeId=<workerId>&status=<status>
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.assigneeId) filter.assigneeId = req.query.assigneeId;
    if (req.query.projectId)  filter.projectId  = req.query.projectId;
    if (req.query.status)     filter.status     = req.query.status;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// POST /api/task — manager only; stamp createdBy from JWT
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: "Failed to create task", error: error.message });
  }
});

// PUT /api/task/:id — any authenticated user (workers update their own task status)
router.put("/:id", async (req, res) => {
  try {
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Task not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update task", error: error.message });
  }
});

// DELETE /api/task/:id — manager only
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted successfully", deletedTask: deleted });
  } catch {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

module.exports = router;
