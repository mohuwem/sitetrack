import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../lib/api";

type Task = {
  _id: string;
  title: string;
  site: string;
  assignee: string;
  priority: string;
  dueDate: string;
  status: string;
  createdAt: string;
  isRecurring?: boolean;
};

type Project = {
  _id: string;
  name: string;
  status: string;
  progress: number;
  budget: number;
  spent: number;
};

type Worker = {
  _id: string;
  trade: string;
  status: string;
  attendance: { status: string; hoursWorked?: number }[];
};

function isOverdue(dueDate: string, status: string) {
  if (!dueDate || status === "Completed") return false;
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

type Metric = { label: string; value: string | number; sub?: string; color?: string };

function MetricCard({ label, value, sub, color }: Metric) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color || "text-gray-800 dark:text-white/90"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function BarRow({ label, count, total, color = "bg-brand-500" }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-800 dark:text-white/90">{count} <span className="text-xs text-gray-400">({pct}%)</span></span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-2.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [t, p, w] = await Promise.allSettled([
        authFetch("/task").then((r) => r.json()),
        authFetch("/project").then((r) => r.json()),
        authFetch("/worker").then((r) => r.json()),
      ]);
      if (t.status === "fulfilled" && Array.isArray(t.value)) setTasks(t.value);
      if (p.status === "fulfilled" && Array.isArray(p.value)) setProjects(p.value);
      if (w.status === "fulfilled" && Array.isArray(w.value)) setWorkers(w.value);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Task metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress").length;
  const blockedTasks = tasks.filter((t) => t.status === "Blocked").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const highPriority = tasks.filter((t) => t.priority === "High").length;
  const mediumPriority = tasks.filter((t) => t.priority === "Medium").length;
  const lowPriority = tasks.filter((t) => t.priority === "Low").length;

  const recurringTasks = tasks.filter((t) => t.isRecurring).length;

  // Assignee leaderboard
  const assigneeMap = tasks.reduce<Record<string, { total: number; completed: number; overdue: number }>>((acc, t) => {
    const a = t.assignee || "Unassigned";
    if (!acc[a]) acc[a] = { total: 0, completed: 0, overdue: 0 };
    acc[a].total++;
    if (t.status === "Completed") acc[a].completed++;
    if (isOverdue(t.dueDate, t.status)) acc[a].overdue++;
    return acc;
  }, {});
  const assigneeList = Object.entries(assigneeMap)
    .map(([name, d]) => ({ name, ...d, rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 8);

  // Site breakdown
  const siteMap = tasks.reduce<Record<string, number>>((acc, t) => {
    const s = t.site || "No site";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const siteList = Object.entries(siteMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Project metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const avgProgress = totalProjects > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress ?? 0), 0) / totalProjects) : 0;
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spent ?? 0), 0);
  const budgetVariance = totalBudget - totalSpent;

  // Worker metrics
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.status === "Active").length;
  const allAttendance = workers.flatMap((w) => w.attendance ?? []);
  const presentCount = allAttendance.filter((a) => a.status === "Present").length;
  const absentCount = allAttendance.filter((a) => a.status === "Absent").length;
  const totalHours = allAttendance.reduce((s, a) => s + (a.hoursWorked ?? 0), 0);
  const attendanceRate = allAttendance.length > 0 ? Math.round((presentCount / allAttendance.length) * 100) : 0;

  const tradeMap = workers.reduce<Record<string, number>>((acc, w) => {
    const t = w.trade || "Unknown";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const tradeList = Object.entries(tradeMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading analytics…</p>
      </div>
    );
  }

  const isEmpty = totalTasks === 0 && totalProjects === 0 && totalWorkers === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Analytics</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Performance insights across tasks, projects, and workers.</p>
      </div>

      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No data yet. Start by adding <Link to="/projects" className="text-brand-500 hover:text-brand-600">projects</Link>, <Link to="/tasks" className="text-brand-500 hover:text-brand-600">tasks</Link>, and <Link to="/workers" className="text-brand-500 hover:text-brand-600">workers</Link>.</p>
        </div>
      )}

      {/* Task analytics */}
      {totalTasks > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Task Analytics</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Tasks" value={totalTasks} />
            <MetricCard label="Completion Rate" value={`${completionRate}%`} sub={`${completedTasks} completed`} color="text-green-600 dark:text-green-400" />
            <MetricCard label="Overdue Tasks" value={overdueTasks} color={overdueTasks > 0 ? "text-red-600 dark:text-red-400" : undefined} />
            <MetricCard label="Recurring Tasks" value={recurringTasks} sub="auto-generates on completion" color="text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="mt-4 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Status Distribution</h3>
              <div className="space-y-3">
                <BarRow label="Completed" count={completedTasks} total={totalTasks} color="bg-green-500" />
                <BarRow label="In Progress" count={inProgressTasks} total={totalTasks} color="bg-blue-500" />
                <BarRow label="Pending" count={tasks.filter((t) => t.status === "Pending").length} total={totalTasks} color="bg-orange-500" />
                <BarRow label="Blocked" count={blockedTasks} total={totalTasks} color="bg-red-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Priority Breakdown</h3>
              <div className="space-y-3">
                <BarRow label="High" count={highPriority} total={totalTasks} color="bg-red-500" />
                <BarRow label="Medium" count={mediumPriority} total={totalTasks} color="bg-orange-500" />
                <BarRow label="Low" count={lowPriority} total={totalTasks} color="bg-green-500" />
              </div>
            </div>
          </div>

          {siteList.length > 0 && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Tasks by Site</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {siteList.map(([site, count]) => (
                  <div key={site} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{site}</p>
                    <p className="mt-1 text-2xl font-semibold text-brand-500">{count}</p>
                    <p className="text-xs text-gray-400">task{count !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assigneeList.length > 0 && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Assignee Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      {["Assignee", "Total", "Completed", "Overdue", "Rate"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {assigneeList.map((a) => (
                      <tr key={a.name}>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90">{a.name}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.total}</td>
                        <td className="px-3 py-2 text-green-600 dark:text-green-400">{a.completed}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">{a.overdue}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                              <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${a.rate}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${a.rate >= 70 ? "text-green-600 dark:text-green-400" : a.rate >= 40 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"}`}>{a.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Project analytics */}
      {totalProjects > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Project Analytics</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Projects" value={totalProjects} />
            <MetricCard label="Active Projects" value={activeProjects} color="text-green-600 dark:text-green-400" />
            <MetricCard label="Avg. Progress" value={`${avgProgress}%`} color="text-blue-600 dark:text-blue-400" />
            <MetricCard label="Budget Variance" value={`${budgetVariance >= 0 ? "+" : ""}£${Math.abs(budgetVariance).toLocaleString()}`} sub={budgetVariance < 0 ? "Over budget" : "Under budget"} color={budgetVariance < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"} />
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Project Progress</h3>
            <div className="space-y-4">
              {projects.slice(0, 8).map((p) => (
                <div key={p._id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate text-gray-700 dark:text-gray-300">{p.name}</span>
                    <span className="ml-4 shrink-0 font-medium text-gray-800 dark:text-white/90">{p.progress ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: `${p.progress ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Worker analytics */}
      {totalWorkers > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Workforce Analytics</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Workers" value={totalWorkers} />
            <MetricCard label="Active" value={activeWorkers} sub={`${Math.round((activeWorkers / totalWorkers) * 100)}% of workforce`} color="text-green-600 dark:text-green-400" />
            <MetricCard label="Attendance Rate" value={`${attendanceRate}%`} sub={`${allAttendance.length} records`} color={attendanceRate >= 80 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"} />
            <MetricCard label="Total Hours Logged" value={Math.round(totalHours)} sub="from attendance records" color="text-purple-600 dark:text-purple-400" />
          </div>

          {tradeList.length > 0 && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Workforce by Trade</h3>
              <div className="space-y-3">
                {tradeList.map(([trade, count]) => (
                  <BarRow key={trade} label={trade} count={count} total={totalWorkers} color="bg-purple-500" />
                ))}
              </div>
            </div>
          )}

          {allAttendance.length > 0 && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Attendance Breakdown</h3>
              <div className="space-y-3">
                <BarRow label="Present" count={presentCount} total={allAttendance.length} color="bg-green-500" />
                <BarRow label="Absent" count={absentCount} total={allAttendance.length} color="bg-red-500" />
                <BarRow label="Late" count={allAttendance.filter((a) => a.status === "Late").length} total={allAttendance.length} color="bg-amber-500" />
                <BarRow label="Half Day" count={allAttendance.filter((a) => a.status === "Half Day").length} total={allAttendance.length} color="bg-blue-500" />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
