const express = require("express");
const CalendarEvent = require("../models/CalendarEvent");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/", async (req, res) => {
  try {
    const events = await CalendarEvent.find().sort({ start: 1 });
    res.json(events);
  } catch {
    res.status(500).json({ message: "Failed to fetch calendar events" });
  }
});

router.post("/", async (req, res) => {
  try {
    const event = await CalendarEvent.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: "Failed to create calendar event", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Event not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update calendar event", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete calendar event" });
  }
});

module.exports = router;
