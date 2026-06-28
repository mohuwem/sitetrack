const express    = require("express");
const Worker     = require("../models/Worker");
const auth       = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(auth);

// GET /api/worker/me — returns the Worker record linked to the calling user
router.get("/me", async (req, res) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) return res.status(404).json({ message: "No worker record linked to this account" });
    res.json(worker);
  } catch {
    res.status(500).json({ message: "Failed to fetch worker record" });
  }
});

// GET /api/worker — any authenticated user (workers need this for profile fallback)
router.get("/", async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json(workers);
  } catch {
    res.status(500).json({ message: "Failed to fetch workers" });
  }
});

// POST /api/worker — manager only
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const worker = await Worker.create(req.body);
    res.status(201).json(worker);
  } catch (error) {
    res.status(400).json({ message: "Failed to create worker", error: error.message });
  }
});

// PUT /api/worker/:id — manager only (workers update themselves via /attendance and /worklog)
router.put("/:id", requireRole("manager"), async (req, res) => {
  try {
    const updated = await Worker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Worker not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update worker", error: error.message });
  }
});

// DELETE /api/worker/:id — manager only
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    const deleted = await Worker.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Worker not found" });
    res.json({ message: "Worker deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete worker" });
  }
});

module.exports = router;
