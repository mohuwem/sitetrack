const express = require("express");
const authMiddleware = require("../middleware/auth");
const Task    = require("../models/Task");
const Project = require("../models/Project");
const Worker  = require("../models/Worker");

const router = express.Router();

// GET /api/search?q=<term>  — searches tasks, projects, workers (max 5 each)
router.get("/", authMiddleware, async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q || q.length < 2) return res.json({ tasks: [], projects: [], workers: [] });

  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  try {
    const [tasks, projects, workers] = await Promise.all([
      Task.find({ $or: [{ title: re }, { site: re }, { assignee: re }] })
        .select("title site status priority")
        .limit(5)
        .lean(),
      Project.find({ $or: [{ name: re }, { description: re }, { manager: re }] })
        .select("name status manager")
        .limit(5)
        .lean(),
      Worker.find({ $or: [{ name: re }, { trade: re }, { employeeId: re }] })
        .select("name trade status")
        .limit(5)
        .lean(),
    ]);

    res.json({ tasks, projects, workers });
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

module.exports = router;
