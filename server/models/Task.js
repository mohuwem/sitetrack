const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    id: String,
    author: String,
    message: String,
    createdAt: String,
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    size: String,
    uploadedAt: String,
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    id: String,
    type: {
      type: String,
      enum: ["system", "comment", "attachment", "subtask", "reminder", "tag", "recurring", "view"],
    },
    message: String,
    createdAt: String,
  },
  { _id: false }
);

const subtaskSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    completed: { type: Boolean, default: false },
    createdAt: String,
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true, trim: true },
    projectId:  { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    site:       { type: String, required: true, trim: true },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", default: null },
    assignee:   { type: String, required: true, trim: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Blocked"],
      default: "Pending",
    },
    reminderAt: { type: String },
    tags: { type: [String], default: [] },
    subtasks: { type: [subtaskSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    activity: { type: [activitySchema], default: [] },
    isRecurring: { type: Boolean, default: false },
    recurringPattern: {
      type: String,
      enum: ["none", "daily", "weekdays", "weekly", "monthly", "yearly"],
      default: "none",
    },
    recurringInterval: { type: Number, default: 1 },
    parentRecurringTaskId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
