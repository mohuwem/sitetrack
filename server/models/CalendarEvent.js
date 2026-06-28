const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    start: { type: String, required: true },
    end: { type: String },
    allDay: { type: Boolean, default: true },
    extendedProps: {
      calendar: { type: String, enum: ["High", "Medium", "Normal", "Complete"], default: "Normal" },
      site: { type: String, trim: true, default: "" },
      crew: { type: String, trim: true, default: "" },
      status: { type: String, enum: ["Scheduled", "In Progress", "Completed", "Blocked"], default: "Scheduled" },
      notes: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CalendarEvent", calendarEventSchema);
