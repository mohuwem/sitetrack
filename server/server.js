const express = require("express");
const cors    = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

const app = express();

connectDB();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SiteTrack API is running");
});

app.use("/api/auth",            require("./routes/authRoutes"));
app.use("/api/task",            require("./routes/taskRoutes"));
app.use("/api/project",         require("./routes/projectRoutes"));
app.use("/api/worker",          require("./routes/workerRoutes"));
app.use("/api/attendance",      require("./routes/attendanceRoutes"));
app.use("/api/worklog",         require("./routes/worklogRoutes"));
app.use("/api/calendar-events", require("./routes/calendarRoutes"));
app.use("/api/search",          require("./routes/searchRoutes"));

// 404 — no route matched
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Global error handler — catches errors passed via next(err)
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
