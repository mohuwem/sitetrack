import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { authFetch } from "../../lib/api";

type Task = {
  _id: string;
  title: string;
  site: string;
  assignee: string;
  priority: string;
  dueDate: string;
  status: string;
  createdAt: string;
};

type Project = {
  _id: string;
  name: string;
  status: string;
  progress: number;
  manager: string;
  endDate: string;
};

type Worker = {
  _id: string;
  name: string;
  trade: string;
  status: string;
  assignedProject: string;
};

type CheckInRecord = {
  _id: string;
  date: string;
  checkIn: string;
  status: string;
  workerId: { _id: string; name: string; trade: string; assignedProject: string };
};

type WorkLogEntry = {
  _id: string;
  date: string;
  message: string;
  blockers: string;
  createdAt: string;
  workerId: { _id: string; name: string; trade: string };
};

function getStatusStyles(status: string) {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
    case "In Progress": return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    case "Blocked": return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
    default: return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400";
  }
}

function getPriorityStyles(priority: string) {
  if (priority === "High") return "text-red-600 dark:text-red-400";
  if (priority === "Medium") return "text-orange-600 dark:text-orange-400";
  return "text-green-600 dark:text-green-400";
}

function getProjectStatusStyles(status: string) {
  switch (status) {
    case "Active": return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
    case "On Hold": return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    case "Completed": return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
    case "Planning": return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400";
  }
}

function isOverdue(dueDate: string, status: string) {
  if (!dueDate || status === "Completed") return false;
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function formatDate(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type LoadState = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkLogEntry[]>([]);
  const [taskLoadState, setTaskLoadState] = useState<LoadState>("idle");
  const [projectLoadState, setProjectLoadState] = useState<LoadState>("idle");
  const [workerLoadState, setWorkerLoadState] = useState<LoadState>("idle");

  const fetchAll = useCallback(async () => {
    setTaskLoadState("loading");
    setProjectLoadState("loading");
    setWorkerLoadState("loading");

    const todayStr = new Date().toISOString().split("T")[0];

    const [taskResult, projectResult, workerResult, attendanceResult, worklogResult] =
      await Promise.allSettled([
        authFetch("/task").then((r) => r.json()),
        authFetch("/project").then((r) => r.json()),
        authFetch("/worker").then((r) => r.json()),
        authFetch(`/attendance?date=${todayStr}`).then((r) => r.json()),
        authFetch("/worklog?limit=6").then((r) => r.json()),
      ]);

    if (taskResult.status === "fulfilled" && Array.isArray(taskResult.value)) {
      setTasks(taskResult.value);
      setTaskLoadState("done");
    } else {
      setTaskLoadState("error");
    }

    if (projectResult.status === "fulfilled" && Array.isArray(projectResult.value)) {
      setProjects(projectResult.value);
      setProjectLoadState("done");
    } else {
      setProjectLoadState("error");
    }

    if (workerResult.status === "fulfilled" && Array.isArray(workerResult.value)) {
      setWorkers(workerResult.value);
      setWorkerLoadState("done");
    } else {
      setWorkerLoadState("error");
    }

    if (attendanceResult.status === "fulfilled" && Array.isArray(attendanceResult.value)) {
      setTodayCheckIns(
        [...attendanceResult.value].sort((a: CheckInRecord, b: CheckInRecord) =>
          a.checkIn > b.checkIn ? 1 : -1
        )
      );
    }

    if (worklogResult.status === "fulfilled" && Array.isArray(worklogResult.value)) {
      setRecentLogs(worklogResult.value);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status));
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");

  const activeProjects = projects.filter((p) => p.status === "Active");
  const activeWorkers = workers.filter((w) => w.status === "Active");

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 6);

  const topProjects = [...projects]
    .filter((p) => p.status === "Active")
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 5);

  const isLoading = taskLoadState === "loading" || projectLoadState === "loading" || workerLoadState === "loading";
  const hasError = taskLoadState === "error" || projectLoadState === "error" || workerLoadState === "error";

  return (
    <>
      <PageMeta title="SiteTrack Dashboard" description="SiteTrack construction site management dashboard" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Live overview of your projects, tasks, and team.
            </p>
          </div>
          <button onClick={fetchAll} disabled={isLoading}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {hasError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-400">
            Some data could not be loaded. Make sure the server is running on port 5000.
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
            <h3 className="mt-2 text-3xl font-semibold text-blue-600 dark:text-blue-400">
              {projectLoadState === "loading" ? "—" : activeProjects.length}
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{projects.length} total project{projects.length !== 1 ? "s" : ""}</p>
            <Link to="/projects" className="mt-3 block text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View projects →</Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Open Tasks</p>
            <h3 className="mt-2 text-3xl font-semibold text-orange-600 dark:text-orange-400">
              {taskLoadState === "loading" ? "—" : openTasks.length}
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{inProgressTasks.length} in progress, {overdueTasks.length > 0 ? <span className="text-red-500">{overdueTasks.length} overdue</span> : "none overdue"}</p>
            <Link to="/tasks" className="mt-3 block text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View tasks →</Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Workers</p>
            <h3 className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
              {workerLoadState === "loading" ? "—" : activeWorkers.length}
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{workers.length} total team member{workers.length !== 1 ? "s" : ""}</p>
            <Link to="/workers" className="mt-3 block text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View workers →</Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
            <h3 className="mt-2 text-3xl font-semibold text-purple-600 dark:text-purple-400">
              {taskLoadState === "loading" ? "—" : tasks.length > 0 ? `${Math.round((completedTasks.length / tasks.length) * 100)}%` : "—"}
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{completedTasks.length} completed of {tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
            <Link to="/analytics" className="mt-3 block text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View analytics →</Link>
          </div>
        </div>

        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""} need attention</p>
                <p className="text-xs text-red-600 dark:text-red-400/80">{overdueTasks.slice(0, 2).map((t) => t.title).join(", ")}{overdueTasks.length > 2 ? ` and ${overdueTasks.length - 2} more` : ""}</p>
              </div>
              <Link to="/tasks" className="shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Review</Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Active projects */}
          <div className="col-span-12 xl:col-span-7">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Projects</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Progress across running projects</p>
                </div>
                <Link to="/projects" className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View all</Link>
              </div>

              {projectLoadState === "loading" && <p className="py-4 text-sm text-gray-400">Loading…</p>}
              {projectLoadState === "error" && <p className="py-4 text-sm text-red-500">Could not load projects.</p>}

              {projectLoadState === "done" && topProjects.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No active projects. <Link to="/projects" className="text-brand-500 hover:text-brand-600">Create one</Link></p>
                </div>
              )}

              {projectLoadState === "done" && topProjects.length > 0 && (
                <div className="space-y-5">
                  {topProjects.map((project) => (
                    <div key={project._id}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">{project.name}</h3>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getProjectStatusStyles(project.status)}`}>{project.status}</span>
                          </div>
                          {project.manager && <p className="text-xs text-gray-500 dark:text-gray-400">Managed by {project.manager}</p>}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">{project.progress ?? 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                        <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${project.progress ?? 0}%` }} />
                      </div>
                      {project.endDate && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Deadline: {formatDate(project.endDate)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="col-span-12 xl:col-span-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Site Snapshot</h2>
              <div className="space-y-3">
                {[
                  { label: "Tasks in progress", value: inProgressTasks.length, color: "bg-blue-500" },
                  { label: "Overdue tasks", value: overdueTasks.length, color: "bg-red-500" },
                  { label: "Tasks completed", value: completedTasks.length, color: "bg-green-500" },
                  { label: "Workers on leave", value: workers.filter((w) => w.status === "On Leave").length, color: "bg-amber-500" },
                  { label: "Projects planning", value: projects.filter((p) => p.status === "Planning").length, color: "bg-purple-500" },
                  { label: "Projects on hold", value: projects.filter((p) => p.status === "On Hold").length, color: "bg-orange-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{isLoading ? "—" : item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's check-ins */}
          {workerLoadState === "done" && workers.length > 0 && (
            <div className="col-span-12 xl:col-span-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Check-ins</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{todayCheckIns.length} worker{todayCheckIns.length !== 1 ? "s" : ""} checked in</p>
                  </div>
                  <Link to="/workers" className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View all</Link>
                </div>
                {todayCheckIns.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">No check-ins yet today.</p>
                ) : (
                  <div className="space-y-2">
                    {todayCheckIns.map((rec) => {
                      const w = rec.workerId;
                      const initials = w.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                      return (
                        <div key={rec._id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.03]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{w.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{w.trade || w.assignedProject || "—"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">{rec.checkIn}</p>
                            <p className="text-xs text-gray-400">check-in</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent tasks */}
          <div className={`col-span-12 ${workerLoadState === "done" && workers.length > 0 ? "xl:col-span-7" : ""}`}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Tasks</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Latest task updates across all sites</p>
                </div>
                <Link to="/tasks" className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View all</Link>
              </div>

              {taskLoadState === "loading" && <p className="py-4 text-sm text-gray-400">Loading…</p>}
              {taskLoadState === "error" && <p className="py-4 text-sm text-red-500">Could not load tasks.</p>}

              {taskLoadState === "done" && recentTasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No tasks yet. <Link to="/tasks" className="text-brand-500 hover:text-brand-600">Create one</Link></p>
                </div>
              )}

              {taskLoadState === "done" && recentTasks.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        {["Task", "Site", "Assignee", "Priority", "Due Date", "Status"].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {recentTasks.map((task) => (
                        <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="px-3 py-3">
                            <p className={`text-sm font-medium ${isOverdue(task.dueDate, task.status) ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>{task.title}</p>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{task.site}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{task.assignee}</td>
                          <td className={`px-3 py-3 text-sm font-medium ${getPriorityStyles(task.priority)}`}>{task.priority}</td>
                          <td className={`px-3 py-3 text-sm ${isOverdue(task.dueDate, task.status) ? "font-medium text-red-500" : "text-gray-600 dark:text-gray-400"}`}>{formatDate(task.dueDate)}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyles(task.status)}`}>{task.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Workers summary */}
          {workerLoadState === "done" && workers.length > 0 && (
            <div className="col-span-12 xl:col-span-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Overview</h2>
                  <Link to="/workers" className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View all</Link>
                </div>
                <div className="space-y-3">
                  {workers.slice(0, 6).map((w) => (
                    <div key={w._id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                          {w.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{w.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{w.trade || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.assignedProject && <p className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">{w.assignedProject}</p>}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400"}`}>{w.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent worker updates */}
          {recentLogs.length > 0 && (
            <div className="col-span-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Worker Updates</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Daily updates submitted by your team</p>
                  </div>
                  <Link to="/worklogs" className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">View all updates</Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {recentLogs.map((log) => {
                    const w = log.workerId;
                    const initials = w.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <div key={log._id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-800 dark:text-white/90">{w.name}</p>
                            <p className="text-xs text-gray-400">{w.trade || "Worker"}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{log.message}</p>
                        {log.blockers && (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Blocker: {log.blockers}</p>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className={`col-span-12 ${workerLoadState === "done" && workers.length > 0 ? "xl:col-span-6" : ""}`}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Create Task", desc: "Log a new site task", href: "/tasks", color: "border-blue-200 hover:bg-blue-50 dark:border-blue-900/40 dark:hover:bg-blue-500/10" },
                  { label: "Add Project", desc: "Start a new project", href: "/projects", color: "border-green-200 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-500/10" },
                  { label: "Add Worker", desc: "Register a team member", href: "/workers", color: "border-purple-200 hover:bg-purple-50 dark:border-purple-900/40 dark:hover:bg-purple-500/10" },
                  { label: "View Reports", desc: "Download or view reports", href: "/reports", color: "border-orange-200 hover:bg-orange-50 dark:border-orange-900/40 dark:hover:bg-orange-500/10" },
                  { label: "Calendar", desc: "View deadlines and schedules", href: "/calendar", color: "border-amber-200 hover:bg-amber-50 dark:border-amber-900/40 dark:hover:bg-amber-500/10" },
                  { label: "Analytics", desc: "Site performance insights", href: "/analytics", color: "border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/40 dark:hover:bg-indigo-500/10" },
                ].map((item) => (
                  <Link key={item.label} to={item.href}
                    className={`flex flex-col rounded-xl border p-4 transition-colors ${item.color}`}>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{item.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
