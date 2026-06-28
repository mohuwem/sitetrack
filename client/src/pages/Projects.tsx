import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../lib/api";

type Milestone = {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
};

type Comment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

type Activity = {
  id: string;
  type: "system" | "comment" | "milestone" | "status";
  message: string;
  createdAt: string;
};

type Project = {
  _id?: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  manager: string;
  client: string;
  location: string;
  budget: number;
  spent: number;
  progress: number;
  milestones: Milestone[];
  comments: Comment[];
  activity: Activity[];
  tags: string[];
  createdAt?: string;
};

type ProjectForm = {
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  manager: string;
  client: string;
  location: string;
  budget: string;
  spent: string;
  progress: string;
  tags: string;
};

type ToastState = {
  message: string;
  type: "success" | "error" | "info";
  visible: boolean;
};

type DrawerTab = "overview" | "milestones" | "comments" | "activity";

const initialForm: ProjectForm = {
  name: "",
  description: "",
  status: "Planning",
  priority: "Medium",
  startDate: "",
  endDate: "",
  manager: "",
  client: "",
  location: "",
  budget: "",
  spent: "",
  progress: "0",
  tags: "",
};

const STATUS_OPTIONS = ["Planning", "Active", "On Hold", "Completed", "Archived"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

function getStatusStyles(status: string) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
    case "Planning":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    case "On Hold":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    case "Completed":
      return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
    case "Archived":
      return "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400";
  }
}

function getPriorityStyles(priority: string) {
  switch (priority) {
    case "High":
      return "text-red-600 dark:text-red-400";
    case "Medium":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-green-600 dark:text-green-400";
  }
}

function formatDate(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function parseTags(input: string): string[] {
  return input.split(",").map((t) => t.trim()).filter(Boolean).filter((t, i, arr) => arr.indexOf(t) === i);
}

function ensureProject(p: Project): Project {
  return {
    ...p,
    milestones: p.milestones ?? [],
    comments: p.comments ?? [],
    activity: p.activity ?? [],
    tags: p.tags ?? [],
    budget: p.budget ?? 0,
    spent: p.spent ?? 0,
    progress: p.progress ?? 0,
  };
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ProjectForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProjectForm>(initialForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "end-asc" | "end-desc">("end-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const [commentInput, setCommentInput] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Site Manager");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [drawerError, setDrawerError] = useState("");

  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });
  const [actionError, setActionError] = useState("");

  const toastRef = useRef<number | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    if (toastRef.current) window.clearTimeout(toastRef.current);
    setToast({ message, type, visible: true });
    toastRef.current = window.setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  };

  useEffect(() => () => { if (toastRef.current) window.clearTimeout(toastRef.current); }, []);

  const fetchProjects = async () => {
    try {
      setError("");
      const res = await authFetch("/project");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data.map(ensureProject));
    } catch {
      setError("Unable to load projects from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const selectedProject = useMemo(() => projects.find((p) => p._id === selectedId) ?? null, [projects, selectedId]);

  const openDrawer = (project: Project, tab: DrawerTab = "overview") => {
    if (!project._id) return;
    setSelectedId(project._id);
    setDrawerTab(tab);
    setDrawerError("");
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setDrawerTab("overview");
    setCommentInput("");
    setNewMilestoneTitle("");
    setNewMilestoneDue("");
    setDrawerError("");
  };

  const persistUpdate = async (id: string, data: Project) => {
    const res = await authFetch(`/project/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to update project");
    return ensureProject(json);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildProjectPayload = (form: ProjectForm, base?: Project): Project => ({
    ...(base ?? {}),
    name: form.name,
    description: form.description,
    status: form.status,
    priority: form.priority,
    startDate: form.startDate,
    endDate: form.endDate,
    manager: form.manager,
    client: form.client,
    location: form.location,
    budget: Number(form.budget) || 0,
    spent: Number(form.spent) || 0,
    progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
    tags: parseTags(form.tags),
    milestones: base?.milestones ?? [],
    comments: base?.comments ?? [],
    activity: base?.activity ?? [
      {
        id: `${Date.now()}-created`,
        type: "system" as const,
        message: "Project created",
        createdAt: new Date().toISOString(),
      },
    ],
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = buildProjectPayload(formData);
      const res = await authFetch("/project", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create project");
      setProjects((prev) => [ensureProject(json), ...prev]);
      setFormData(initialForm);
      setShowForm(false);
      showToast("Project created successfully");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to save project");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingId(project._id || null);
    setEditForm({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate ?? "",
      endDate: project.endDate ?? "",
      manager: project.manager,
      client: project.client,
      location: project.location,
      budget: String(project.budget ?? ""),
      spent: String(project.spent ?? ""),
      progress: String(project.progress ?? "0"),
      tags: (project.tags ?? []).join(", "),
    });
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditForm(initialForm);
    setEditError("");
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    setEditError("");
    const existing = projects.find((p) => p._id === editingId);
    if (!existing) { setEditError("Project not found"); setEditSubmitting(false); return; }
    try {
      const activityEntry: Activity = {
        id: `${Date.now()}-edit`,
        type: "system",
        message: "Project details updated",
        createdAt: new Date().toISOString(),
      };
      const payload = buildProjectPayload(editForm, {
        ...existing,
        activity: [...existing.activity, activityEntry],
      });
      const saved = await persistUpdate(editingId, payload);
      setProjects((prev) => prev.map((p) => (p._id === editingId ? saved : p)));
      closeEditModal();
      showToast("Project updated successfully");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to update project");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this project?")) return;
    setActionError("");
    try {
      const res = await authFetch(`/project/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      setProjects((prev) => prev.filter((p) => p._id !== id));
      if (selectedId === id) closeDrawer();
      showToast("Project deleted");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to delete project");
    }
  };

  const handleAddComment = async () => {
    if (!selectedProject?._id) return;
    if (!commentInput.trim()) { setDrawerError("Enter a comment before submitting."); return; }
    setDrawerError("");
    const ts = new Date().toISOString();
    const newComment: Comment = { id: `${Date.now()}-c`, author: commentAuthor || "Site Manager", message: commentInput.trim(), createdAt: ts };
    const newActivity: Activity = { id: `${Date.now()}-ca`, type: "comment", message: `${newComment.author} added a comment`, createdAt: ts };
    const updated: Project = { ...selectedProject, comments: [...selectedProject.comments, newComment], activity: [...selectedProject.activity, newActivity] };
    try {
      const saved = await persistUpdate(selectedProject._id, updated);
      setProjects((prev) => prev.map((p) => (p._id === selectedProject._id ? saved : p)));
      setCommentInput("");
      showToast("Comment added");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to add comment");
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedProject?._id) return;
    if (!newMilestoneTitle.trim()) { setDrawerError("Enter a milestone title."); return; }
    setDrawerError("");
    const ts = new Date().toISOString();
    const newMilestone: Milestone = { id: `${Date.now()}-m`, title: newMilestoneTitle.trim(), dueDate: newMilestoneDue, completed: false };
    const newActivity: Activity = { id: `${Date.now()}-ma`, type: "milestone", message: `Milestone added: ${newMilestone.title}`, createdAt: ts };
    const updated: Project = { ...selectedProject, milestones: [...selectedProject.milestones, newMilestone], activity: [...selectedProject.activity, newActivity] };
    try {
      const saved = await persistUpdate(selectedProject._id, updated);
      setProjects((prev) => prev.map((p) => (p._id === selectedProject._id ? saved : p)));
      setNewMilestoneTitle("");
      setNewMilestoneDue("");
      showToast("Milestone added");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to add milestone");
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedProject?._id) return;
    const target = selectedProject.milestones.find((m) => m.id === milestoneId);
    if (!target) return;
    const ts = new Date().toISOString();
    const updated: Project = {
      ...selectedProject,
      milestones: selectedProject.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed, completedAt: !m.completed ? ts : undefined } : m
      ),
      activity: [...selectedProject.activity, {
        id: `${Date.now()}-mt`,
        type: "milestone",
        message: `Milestone "${target.title}" marked ${target.completed ? "incomplete" : "complete"}`,
        createdAt: ts,
      }],
    };
    try {
      const saved = await persistUpdate(selectedProject._id, updated);
      setProjects((prev) => prev.map((p) => (p._id === selectedProject._id ? saved : p)));
      showToast("Milestone updated");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to update milestone");
    }
  };

  const handleProgressUpdate = async (id: string, newProgress: number) => {
    const project = projects.find((p) => p._id === id);
    if (!project) return;
    const clamped = Math.min(100, Math.max(0, newProgress));
    const ts = new Date().toISOString();
    const updated: Project = {
      ...project,
      progress: clamped,
      activity: [...project.activity, { id: `${Date.now()}-prog`, type: "system", message: `Progress updated to ${clamped}%`, createdAt: ts }],
    };
    try {
      const saved = await persistUpdate(id, updated);
      setProjects((prev) => prev.map((p) => (p._id === id ? saved : p)));
      showToast(`Progress set to ${clamped}%`);
    } catch {
      showToast("Failed to update progress", "error");
    }
  };

  const filteredProjects = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return projects
      .filter((p) => {
        const matchSearch = !q || p.name.toLowerCase().includes(q) || p.manager.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
        const matchStatus = statusFilter === "All" || p.status === statusFilter;
        const matchPriority = priorityFilter === "All" || p.priority === priorityFilter;
        return matchSearch && matchStatus && matchPriority;
      })
      .sort((a, b) => {
        if (sortOrder === "newest") return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        if (sortOrder === "oldest") return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
        if (sortOrder === "end-desc") return new Date(b.endDate ?? 0).getTime() - new Date(a.endDate ?? 0).getTime();
        return new Date(a.endDate ?? 0).getTime() - new Date(b.endDate ?? 0).getTime();
      });
  }, [projects, searchTerm, statusFilter, priorityFilter, sortOrder]);

  // Reset to page 1 whenever filters, search, or sort change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, priorityFilter, sortOrder]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const totalProjects = projects.length;
  const activeCount = projects.filter((p) => p.status === "Active").length;
  const completedCount = projects.filter((p) => p.status === "Completed").length;
  const onHoldCount = projects.filter((p) => p.status === "On Hold").length;
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spent ?? 0), 0);

  const FormFields = ({ data, onChange, error: formError, submitting: busy, onCancel }: {
    data: ProjectForm;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    error: string;
    submitting: boolean;
    onCancel: () => void;
  }) => (
    <div className="grid gap-4">
      <input type="text" name="name" placeholder="Project name *" value={data.name} onChange={onChange} required
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      <textarea name="description" placeholder="Description" value={data.description} onChange={onChange} rows={2}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white resize-none" />
      <div className="grid gap-4 sm:grid-cols-2">
        <select name="status" value={data.status} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="priority" value={data.priority} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="date" name="startDate" value={data.startDate} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="date" name="endDate" value={data.endDate} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="text" name="manager" placeholder="Project manager" value={data.manager} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="text" name="client" placeholder="Client" value={data.client} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </div>
      <input type="text" name="location" placeholder="Location / site address" value={data.location} onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      <div className="grid gap-4 sm:grid-cols-3">
        <input type="number" name="budget" placeholder="Budget (£)" value={data.budget} onChange={onChange} min={0}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="number" name="spent" placeholder="Spent (£)" value={data.spent} onChange={onChange} min={0}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="number" name="progress" placeholder="Progress %" value={data.progress} onChange={onChange} min={0} max={100}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </div>
      <input type="text" name="tags" placeholder="Tags, comma separated" value={data.tags} onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      {formError && <p className="text-sm text-red-500">{formError}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
          {busy ? "Saving..." : "Save Project"}
        </button>
        <button type="button" onClick={onCancel}
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === "error" ? "bg-red-500" : toast.type === "info" ? "bg-blue-500" : "bg-green-500"}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Projects</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Track construction projects, milestones, budgets, and progress.</p>
        </div>
        <button onClick={() => setShowForm((p) => !p)}
          className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
          {showForm ? "Close Form" : "+ New Project"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total", value: totalProjects, cls: "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", textCls: "text-gray-800 dark:text-white/90" },
          { label: "Active", value: activeCount, cls: "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-500/10", textCls: "text-green-700 dark:text-green-300" },
          { label: "Completed", value: completedCount, cls: "border-purple-200 bg-purple-50 dark:border-purple-900/40 dark:bg-purple-500/10", textCls: "text-purple-700 dark:text-purple-300" },
          { label: "On Hold", value: onHoldCount, cls: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-500/10", textCls: "text-amber-700 dark:text-amber-300" },
          { label: "Total Budget", value: formatCurrency(totalBudget), cls: "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-500/10", textCls: "text-blue-700 dark:text-blue-300" },
          { label: "Total Spent", value: formatCurrency(totalSpent), cls: "border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-500/10", textCls: "text-orange-700 dark:text-orange-300" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-5 ${s.cls}`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${s.textCls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">New Project</h2>
          <form onSubmit={handleSubmit}>
            <FormFields data={formData} onChange={handleChange} error={submitError} submitting={submitting} onCancel={() => { setShowForm(false); setFormData(initialForm); setSubmitError(""); }} />
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}>
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 overflow-y-auto max-h-[90vh]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Edit Project</h2>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <FormFields data={editForm} onChange={handleEditChange} error={editError} submitting={editSubmitting} onCancel={closeEditModal} />
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <input type="text" placeholder="Search projects…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="All">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="end-asc">Deadline: Soonest first</option>
            <option value="end-desc">Deadline: Latest first</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredProjects.length === 0 ? "No projects match your filters" : (
            <>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} projects</>
          )}
        </p>

        {actionError && <p className="mb-4 text-sm text-red-500">{actionError}</p>}
        {loading && <p className="py-6 text-sm text-gray-500 dark:text-gray-400">Loading projects…</p>}
        {error && <p className="py-6 text-sm text-red-500">{error}</p>}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet. Create your first project above.</p>
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && projects.length > 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">No projects match your filters.</p>
          </div>
        )}

        {/* Project cards */}
        {!loading && !error && filteredProjects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedProjects.map((project) => {
              const budgetUsage = project.budget > 0 ? Math.min(100, Math.round((project.spent / project.budget) * 100)) : 0;
              const milestonesTotal = project.milestones.length;
              const milestonesCompleted = project.milestones.filter((m) => m.completed).length;
              return (
                <div key={project._id}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:shadow-gray-800/20">
                  {/* Card header */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <button onClick={() => openDrawer(project)} className="text-left">
                        <h3 className="truncate font-semibold text-gray-800 hover:text-brand-500 dark:text-white/90">{project.name}</h3>
                      </button>
                      {project.location && (
                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{project.location}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyles(project.status)}`}>{project.status}</span>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
                  )}

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {project.manager && <span>Manager: <span className="font-medium text-gray-700 dark:text-gray-300">{project.manager}</span></span>}
                    {project.client && <span>Client: <span className="font-medium text-gray-700 dark:text-gray-300">{project.client}</span></span>}
                    {project.endDate && <span>Deadline: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(project.endDate)}</span></span>}
                    {milestonesTotal > 0 && <span>Milestones: <span className="font-medium text-gray-700 dark:text-gray-300">{milestonesCompleted}/{milestonesTotal}</span></span>}
                  </div>

                  {/* Budget */}
                  {project.budget > 0 && (
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Budget</span>
                        <span>{formatCurrency(project.spent)} / {formatCurrency(project.budget)} ({budgetUsage}%)</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className={`h-full rounded-full transition-all ${budgetUsage > 90 ? "bg-red-500" : budgetUsage > 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${budgetUsage}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Priority + tags */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-medium ${getPriorityStyles(project.priority)}`}>{project.priority} priority</span>
                    {project.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-white/[0.07] dark:text-gray-300">{tag}</span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <button onClick={() => openDrawer(project)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]">
                      Details
                    </button>
                    <button
                      onClick={() => project._id && navigate(`/tasks?project=${project._id}&name=${encodeURIComponent(project.name)}`)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
                      View Tasks
                    </button>
                    <button onClick={() => openEditModal(project)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]">
                      Edit
                    </button>
                    <button onClick={() => project._id && handleDelete(project._id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        )}
      </div>

      {/* Detail Drawer */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}>
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="relative ml-auto flex h-full w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-gray-800 dark:text-white/90">{selectedProject.name}</h2>
                {selectedProject.location && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{selectedProject.location}</p>}
              </div>
              <button onClick={closeDrawer} className="ml-4 shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
            </div>

            {/* Drawer tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              {(["overview", "milestones", "comments", "activity"] as const).map((tab) => (
                <button key={tab} onClick={() => setDrawerTab(tab)}
                  className={`flex-1 px-2 py-3 text-xs font-medium capitalize ${drawerTab === tab ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {drawerError && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{drawerError}</p>}

              {drawerTab === "overview" && (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusStyles(selectedProject.status)}`}>{selectedProject.status}</span>
                    <span className={`text-sm font-medium ${getPriorityStyles(selectedProject.priority)}`}>{selectedProject.priority} priority</span>
                  </div>
                  {selectedProject.description && <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProject.description}</p>}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedProject.manager && <div><p className="text-xs text-gray-500 dark:text-gray-400">Manager</p><p className="font-medium text-gray-800 dark:text-white/90">{selectedProject.manager}</p></div>}
                    {selectedProject.client && <div><p className="text-xs text-gray-500 dark:text-gray-400">Client</p><p className="font-medium text-gray-800 dark:text-white/90">{selectedProject.client}</p></div>}
                    {selectedProject.startDate && <div><p className="text-xs text-gray-500 dark:text-gray-400">Start date</p><p className="font-medium text-gray-800 dark:text-white/90">{formatDate(selectedProject.startDate)}</p></div>}
                    {selectedProject.endDate && <div><p className="text-xs text-gray-500 dark:text-gray-400">Deadline</p><p className="font-medium text-gray-800 dark:text-white/90">{formatDate(selectedProject.endDate)}</p></div>}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress: {selectedProject.progress}%</p>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${selectedProject.progress}%` }} />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input type="range" min={0} max={100} value={selectedProject.progress}
                        onChange={(e) => selectedProject._id && handleProgressUpdate(selectedProject._id, Number(e.target.value))}
                        className="flex-1" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{selectedProject.progress}%</span>
                    </div>
                  </div>
                  {selectedProject.budget > 0 && (
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Budget</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Budget</p><p className="font-semibold text-gray-800 dark:text-white/90">{formatCurrency(selectedProject.budget)}</p></div>
                        <div><p className="text-xs text-gray-500 dark:text-gray-400">Spent</p><p className={`font-semibold ${selectedProject.spent > selectedProject.budget ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white/90"}`}>{formatCurrency(selectedProject.spent)}</p></div>
                      </div>
                    </div>
                  )}
                  {selectedProject.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tags.map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/[0.07] dark:text-gray-300">{tag}</span>)}
                    </div>
                  )}
                </div>
              )}

              {drawerTab === "milestones" && (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add milestone</p>
                    <input type="text" placeholder="Milestone title" value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <input type="date" value={newMilestoneDue} onChange={(e) => setNewMilestoneDue(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <button onClick={handleAddMilestone}
                      className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Add Milestone</button>
                  </div>
                  {selectedProject.milestones.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No milestones yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedProject.milestones.map((m) => (
                        <div key={m.id} className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                          <button onClick={() => handleToggleMilestone(m.id)}
                            className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${m.completed ? "border-green-500 bg-green-500 text-white" : "border-gray-300 dark:border-gray-600"}`}>
                            {m.completed && <span className="text-xs">✓</span>}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${m.completed ? "line-through text-gray-400" : "text-gray-800 dark:text-white/90"}`}>{m.title}</p>
                            {m.dueDate && <p className="text-xs text-gray-500 dark:text-gray-400">Due: {formatDate(m.dueDate)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {drawerTab === "comments" && (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <input type="text" placeholder="Your name" value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <textarea rows={3} placeholder="Add a comment…" value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <button onClick={handleAddComment}
                      className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Post Comment</button>
                  </div>
                  {selectedProject.comments.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...selectedProject.comments].reverse().map((c) => (
                        <div key={c.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.author}</p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{c.message}</p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{new Date(c.createdAt).toLocaleString("en-GB")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {drawerTab === "activity" && (
                <div className="space-y-3">
                  {selectedProject.activity.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No activity recorded.</p>
                  ) : (
                    [...selectedProject.activity].reverse().map((a) => (
                      <div key={a.id} className="flex gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{a.message}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(a.createdAt).toLocaleString("en-GB")}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
