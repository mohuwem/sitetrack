const mongoose = require("mongoose");

const workLogSchema = new mongoose.Schema(
  {
    workerId:  { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    taskId:    { type: mongoose.Schema.Types.ObjectId, ref: "Task",    default: null },
    date:      { type: String, required: true },      // "YYYY-MM-DD"
    message:   { type: String, required: true, trim: true },
    blockers:  { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

workLogSchema.index({ workerId: 1, date: -1 });
workLogSchema.index({ date: -1 });
workLogSchema.index({ projectId: 1, date: -1 });

module.exports = mongoose.model("WorkLog", workLogSchema);
