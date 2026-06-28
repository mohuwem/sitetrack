const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    dueDate: String,
    completed: { type: Boolean, default: false },
    completedAt: String,
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    id: String,
    author: String,
    message: String,
    createdAt: String,
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    id: String,
    type: { type: String, enum: ["system", "comment", "milestone", "status"] },
    message: String,
    createdAt: String,
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed", "Archived"],
      default: "Planning",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    startDate: { type: String },
    endDate: { type: String },
    managerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    manager:    { type: String, trim: true, default: "" },
    workerIds:  { type: [mongoose.Schema.Types.ObjectId], ref: "Worker", default: [] },
    client:     { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    milestones: { type: [milestoneSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    activity: { type: [activitySchema], default: [] },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
