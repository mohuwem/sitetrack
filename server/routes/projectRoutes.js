const express    = require("express");
const Project    = require("../models/Project");
const auth       = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(auth);

// GET /api/project — any authenticated user
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch {
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

// POST /api/project — manager only; stamp managerId from JWT
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
      managerId: req.user.id,
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: "Failed to create project", error: error.message });
  }
});

// PUT /api/project/:id — manager only
router.put("/:id", requireRole("manager"), async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Project not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update project", error: error.message });
  }
});

// DELETE /api/project/:id — manager only
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete project" });
  }
});

module.exports = router;
