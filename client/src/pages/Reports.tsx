import { useEffect, useState } from "react";
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
};

type Project = {
  _id: string;
  name: string;
  status: string;
  progress: number;
  manager: string;
  budget: number;
  spent: number;
  endDate: string;
};

type Worker = {
  _id: string;
  name: string;
  trade: string;
  status: string;
  assignedProject: string;
  attendance: { status: string }[];
};

function formatDate(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n || 0);
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

export default function Reports() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<"tasks" | "projects" | "workers">("tasks");

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

  const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status));
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const tasksByStatus = ["Pending", "In Progress", "Completed", "Blocked"].map((s) => ({
    status: s,
    count: tasks.filter((t) => t.status === s).length,
  }));
  const tasksByPriority = ["High", "Medium", "Low"].map((p) => ({
    priority: p,
    count: tasks.filter((t) => t.priority === p).length,
  }));

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spent || 0), 0);
  const projectsByStatus = ["Planning", "Active", "On Hold", "Completed", "Archived"].map((s) => ({
    status: s,
    count: projects.filter((p) => p.status === s).length,
  }));

  const workersByStatus = ["Active", "On Leave", "Off Duty", "Terminated"].map((s) => ({
    status: s,
    count: workers.filter((w) => w.status === s).length,
  }));
  const tradeBreakdown = [...new Set(workers.map((w) => w.trade).filter(Boolean))].map((trade) => ({
    trade,
    count: workers.filter((w) => w.trade === trade).length,
  })).sort((a, b) => b.count - a.count);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Reports</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Summary reports for tasks, projects, and workers.</p>
        </div>
        <button onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
          Print / Export
        </button>
      </div>

      {/* Report tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.03]">
        {(["tasks", "projects", "workers"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveReport(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${activeReport === tab ? "bg-white text-gray-900 shadow-sm dark:bg-white/[0.08] dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading && <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading report data…</p>}

      {!loading && activeReport === "tasks" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Tasks", value: tasks.length, cls: "" },
              { label: "Completed", value: completedTasks.length, cls: "text-green-600 dark:text-green-400" },
              { label: "Overdue", value: overdueTasks.length, cls: "text-red-600 dark:text-red-400" },
              { label: "Completion Rate", value: tasks.length > 0 ? `${Math.round((completedTasks.length / tasks.length) * 100)}%` : "—", cls: "text-brand-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`mt-2 text-3xl font-semibold ${s.cls || "text-gray-800 dark:text-white/90"}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Tasks by Status</h2>
              <div className="space-y-3">
                {tasksByStatus.map((item) => (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{item.status}</span>
                      <span className="font-medium text-gray-800 dark:text-white/90">{item.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: tasks.length > 0 ? `${(item.count / tasks.length) * 100}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Tasks by Priority</h2>
              <div className="space-y-3">
                {tasksByPriority.map((item) => (
                  <div key={item.priority}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className={item.priority === "High" ? "text-red-600 dark:text-red-400" : item.priority === "Medium" ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}>{item.priority}</span>
                      <span className="font-medium text-gray-800 dark:text-white/90">{item.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className={`h-2 rounded-full ${item.priority === "High" ? "bg-red-500" : item.priority === "Medium" ? "bg-orange-500" : "bg-green-500"}`} style={{ width: tasks.length > 0 ? `${(item.count / tasks.length) * 100}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overdue tasks table */}
          {overdueTasks.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900/40 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-red-700 dark:text-red-400">Overdue Tasks ({overdueTasks.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      {["Task", "Site", "Assignee", "Priority", "Due Date", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {overdueTasks.map((t) => (
                      <tr key={t._id}>
                        <td className="px-3 py-2 font-medium text-red-600 dark:text-red-400">{t.title}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.site}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.assignee}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.priority}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">{formatDate(t.dueDate)}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && activeReport === "projects" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Projects", value: projects.length, cls: "" },
              { label: "Active", value: projects.filter((p) => p.status === "Active").length, cls: "text-green-600 dark:text-green-400" },
              { label: "Total Budget", value: formatCurrency(totalBudget), cls: "text-blue-600 dark:text-blue-400" },
              { label: "Total Spent", value: formatCurrency(totalSpent), cls: totalSpent > totalBudget ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${s.cls || "text-gray-800 dark:text-white/90"}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Projects by Status</h2>
            <div className="space-y-3">
              {projectsByStatus.map((item) => (
                <div key={item.status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.status}</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">{item.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: projects.length > 0 ? `${(item.count / projects.length) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {projects.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">All Projects</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      {["Project", "Status", "Manager", "Progress", "Budget", "Spent", "Deadline"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {projects.map((p) => (
                      <tr key={p._id}>
                        <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">{p.name}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{p.status}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{p.manager || "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                              <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${p.progress ?? 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{p.progress ?? 0}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{formatCurrency(p.budget)}</td>
                        <td className={`px-3 py-3 ${p.spent > p.budget && p.budget > 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>{formatCurrency(p.spent)}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{formatDate(p.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && activeReport === "workers" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Workers", value: workers.length, cls: "" },
              { label: "Active", value: workers.filter((w) => w.status === "Active").length, cls: "text-green-600 dark:text-green-400" },
              { label: "On Leave", value: workers.filter((w) => w.status === "On Leave").length, cls: "text-blue-600 dark:text-blue-400" },
              { label: "Trades", value: tradeBreakdown.length, cls: "text-purple-600 dark:text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`mt-2 text-3xl font-semibold ${s.cls || "text-gray-800 dark:text-white/90"}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Workers by Status</h2>
              <div className="space-y-3">
                {workersByStatus.map((item) => (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{item.status}</span>
                      <span className="font-medium text-gray-800 dark:text-white/90">{item.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: workers.length > 0 ? `${(item.count / workers.length) * 100}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Workers by Trade</h2>
              {tradeBreakdown.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No trade data.</p>
              ) : (
                <div className="space-y-3">
                  {tradeBreakdown.slice(0, 8).map((item) => (
                    <div key={item.trade}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{item.trade}</span>
                        <span className="font-medium text-gray-800 dark:text-white/90">{item.count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-2 rounded-full bg-purple-500" style={{ width: workers.length > 0 ? `${(item.count / workers.length) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {workers.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Worker Roster</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      {["Name", "Trade", "Status", "Project"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {workers.map((w) => (
                      <tr key={w._id}>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90">{w.name}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{w.trade || "—"}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400"}`}>{w.status}</span></td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{w.assignedProject || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
