import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../lib/api";

type Certification = {
  id: string;
  name: string;
  issuedBy: string;
  issueDate: string;
  expiryDate: string;
};

type Note = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

type AttendanceRecord = {
  _id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: "Present" | "Absent" | "Late" | "Half Day";
  project: string;
};

type Worker = {
  _id?: string;
  userId?: string | null;
  name: string;
  email: string;
  phone: string;
  address: string;
  employeeId: string;
  trade: string;
  skills: string[];
  status: string;
  assignedProject: string;
  startDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  certifications: Certification[];
  attendance: AttendanceRecord[];
  notes: Note[];
  avatarInitials: string;
  createdAt?: string;
};

type WorkerForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  employeeId: string;
  trade: string;
  skills: string;
  status: string;
  assignedProject: string;
  startDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type ToastState = {
  message: string;
  type: "success" | "error" | "info";
  visible: boolean;
};

type DrawerTab = "profile" | "certifications" | "attendance" | "notes";

const TRADES = [
  "General Labourer", "Electrician", "Plumber", "Carpenter", "Bricklayer",
  "Steel Fixer", "Scaffolder", "Painter & Decorator", "Plasterer",
  "Plant Operator", "Site Supervisor", "Project Manager", "Civil Engineer",
  "Health & Safety Officer", "Other",
];

const STATUSES = ["Active", "On Leave", "Off Duty", "Terminated"];

const initialForm: WorkerForm = {
  name: "", email: "", phone: "", address: "", employeeId: "",
  trade: "", skills: "", status: "Active", assignedProject: "",
  startDate: "", emergencyContactName: "", emergencyContactPhone: "",
};

function getStatusStyles(status: string) {
  switch (status) {
    case "Active": return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
    case "On Leave": return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    case "Off Duty": return "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400";
    case "Terminated": return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400";
  }
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function parseTags(input: string): string[] {
  return input.split(",").map((s) => s.trim()).filter(Boolean).filter((s, i, arr) => arr.indexOf(s) === i);
}

function ensureWorker(w: Worker): Worker {
  return {
    ...w,
    skills: w.skills ?? [],
    certifications: w.certifications ?? [],
    attendance: w.attendance ?? [],
    notes: w.notes ?? [],
    avatarInitials: w.avatarInitials || getInitials(w.name),
  };
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500",
  "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-rose-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<WorkerForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<WorkerForm>(initialForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tradeFilter, setTradeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("profile");
  const [noteInput, setNoteInput] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("Site Manager");
  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");
  const [newCertIssueDate, setNewCertIssueDate] = useState("");
  const [newCertExpiry, setNewCertExpiry] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceCheckIn, setAttendanceCheckIn] = useState("");
  const [attendanceCheckOut, setAttendanceCheckOut] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<"Present" | "Absent" | "Late" | "Half Day">("Present");
  const [attendanceProject, setAttendanceProject] = useState("");
  const [drawerAttendance, setDrawerAttendance] = useState<AttendanceRecord[]>([]);
  const [drawerAttendanceLoading, setDrawerAttendanceLoading] = useState(false);
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

  const fetchWorkers = async () => {
    try {
      setError("");
      const res = await authFetch("/worker");
      if (!res.ok) throw new Error("Failed to fetch workers");
      const data = await res.json();
      setWorkers(data.map(ensureWorker));
    } catch {
      setError("Unable to load workers from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); }, []);

  useEffect(() => {
    if (!selectedId || drawerTab !== "attendance") return;
    setDrawerAttendanceLoading(true);
    authFetch(`/attendance?workerId=${selectedId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDrawerAttendance(data); })
      .catch(() => {})
      .finally(() => setDrawerAttendanceLoading(false));
  }, [selectedId, drawerTab]);

  const selectedWorker = useMemo(() => workers.find((w) => w._id === selectedId) ?? null, [workers, selectedId]);

  const openDrawer = (worker: Worker, tab: DrawerTab = "profile") => {
    if (!worker._id) return;
    setSelectedId(worker._id);
    setDrawerTab(tab);
    setDrawerError("");
    setDrawerAttendance([]);
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setDrawerTab("profile");
    setNoteInput("");
    setDrawerError("");
    setDrawerAttendance([]);
  };

  const persistUpdate = async (id: string, data: Worker) => {
    const res = await authFetch(`/worker/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to update worker");
    return ensureWorker(json);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = (form: WorkerForm, base?: Worker): Worker => ({
    ...(base ?? {}),
    name: form.name,
    email: form.email,
    phone: form.phone,
    address: form.address,
    employeeId: form.employeeId,
    trade: form.trade,
    skills: parseTags(form.skills),
    status: form.status,
    assignedProject: form.assignedProject,
    startDate: form.startDate,
    emergencyContactName: form.emergencyContactName,
    emergencyContactPhone: form.emergencyContactPhone,
    avatarInitials: getInitials(form.name),
    certifications: base?.certifications ?? [],
    attendance: base?.attendance ?? [],
    notes: base?.notes ?? [],
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = buildPayload(formData);
      const res = await authFetch("/worker", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create worker");
      setWorkers((prev) => [ensureWorker(json), ...prev]);
      setFormData(initialForm);
      setShowForm(false);
      showToast("Worker added successfully");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to save worker");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (worker: Worker) => {
    setEditingId(worker._id || null);
    setEditForm({
      name: worker.name, email: worker.email, phone: worker.phone,
      address: worker.address, employeeId: worker.employeeId, trade: worker.trade,
      skills: worker.skills.join(", "), status: worker.status,
      assignedProject: worker.assignedProject, startDate: worker.startDate ?? "",
      emergencyContactName: worker.emergencyContactName,
      emergencyContactPhone: worker.emergencyContactPhone,
    });
    setEditError("");
  };

  const closeEditModal = () => { setEditingId(null); setEditForm(initialForm); setEditError(""); };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    setEditError("");
    const existing = workers.find((w) => w._id === editingId);
    if (!existing) { setEditError("Worker not found"); setEditSubmitting(false); return; }
    try {
      const payload = buildPayload(editForm, existing);
      const saved = await persistUpdate(editingId, payload);
      setWorkers((prev) => prev.map((w) => (w._id === editingId ? saved : w)));
      closeEditModal();
      showToast("Worker updated");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to update worker");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this worker?")) return;
    setActionError("");
    try {
      const res = await authFetch(`/worker/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete worker");
      setWorkers((prev) => prev.filter((w) => w._id !== id));
      if (selectedId === id) closeDrawer();
      showToast("Worker removed");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to remove worker");
    }
  };

  const handleAddNote = async () => {
    if (!selectedWorker?._id) return;
    if (!noteInput.trim()) { setDrawerError("Enter a note before submitting."); return; }
    setDrawerError("");
    const newNote: Note = { id: `${Date.now()}-n`, author: noteAuthor || "Site Manager", message: noteInput.trim(), createdAt: new Date().toISOString() };
    const updated: Worker = { ...selectedWorker, notes: [...selectedWorker.notes, newNote] };
    try {
      const saved = await persistUpdate(selectedWorker._id, updated);
      setWorkers((prev) => prev.map((w) => (w._id === selectedWorker._id ? saved : w)));
      setNoteInput("");
      showToast("Note added");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to add note");
    }
  };

  const handleAddCertification = async () => {
    if (!selectedWorker?._id) return;
    if (!newCertName.trim()) { setDrawerError("Enter a certification name."); return; }
    setDrawerError("");
    const cert: Certification = { id: `${Date.now()}-cert`, name: newCertName.trim(), issuedBy: newCertIssuer.trim(), issueDate: newCertIssueDate, expiryDate: newCertExpiry };
    const updated: Worker = { ...selectedWorker, certifications: [...selectedWorker.certifications, cert] };
    try {
      const saved = await persistUpdate(selectedWorker._id, updated);
      setWorkers((prev) => prev.map((w) => (w._id === selectedWorker._id ? saved : w)));
      setNewCertName(""); setNewCertIssuer(""); setNewCertIssueDate(""); setNewCertExpiry("");
      showToast("Certification added");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to add certification");
    }
  };

  const handleLogAttendance = async () => {
    if (!selectedWorker?._id) return;
    if (!attendanceDate) { setDrawerError("Select a date."); return; }
    setDrawerError("");
    const hoursWorked = attendanceCheckIn && attendanceCheckOut
      ? Math.max(0, (new Date(`1970-01-01T${attendanceCheckOut}`).getTime() - new Date(`1970-01-01T${attendanceCheckIn}`).getTime()) / 3600000)
      : 0;
    try {
      const res = await authFetch("/attendance", {
        method: "POST",
        body: JSON.stringify({
          workerId:    selectedWorker._id,
          date:        attendanceDate,
          checkIn:     attendanceCheckIn,
          checkOut:    attendanceCheckOut,
          hoursWorked: Math.round(hoursWorked * 10) / 10,
          status:      attendanceStatus,
          project:     attendanceProject.trim(),
          submittedBy: "manager",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to log attendance");
      setDrawerAttendance((prev) => [json, ...prev]);
      setAttendanceDate(""); setAttendanceCheckIn(""); setAttendanceCheckOut(""); setAttendanceProject("");
      setAttendanceStatus("Present");
      showToast("Attendance logged");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to log attendance");
    }
  };

  const allTrades = useMemo(() => [...new Set(workers.map((w) => w.trade).filter(Boolean))].sort(), [workers]);

  const filteredWorkers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return workers.filter((w) => {
      const matchSearch = !q || w.name.toLowerCase().includes(q) || w.trade.toLowerCase().includes(q) || w.assignedProject.toLowerCase().includes(q) || w.employeeId.toLowerCase().includes(q) || w.skills.some((s) => s.toLowerCase().includes(q));
      const matchStatus = statusFilter === "All" || w.status === statusFilter;
      const matchTrade = tradeFilter === "All" || w.trade === tradeFilter;
      return matchSearch && matchStatus && matchTrade;
    });
  }, [workers, searchTerm, statusFilter, tradeFilter]);

  // Reset to page 1 whenever filters or search change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, tradeFilter]);

  const totalPages = Math.ceil(filteredWorkers.length / ITEMS_PER_PAGE);
  const paginatedWorkers = filteredWorkers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const activeCount = workers.filter((w) => w.status === "Active").length;
  const onLeaveCount = workers.filter((w) => w.status === "On Leave").length;
  const linkedCount = workers.filter((w) => w.userId).length;

  const FormFields = ({ data, onChange, error: fe, submitting: busy, onCancel }: {
    data: WorkerForm; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    error: string; submitting: boolean; onCancel: () => void;
  }) => (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="text" name="name" placeholder="Full name *" value={data.name} onChange={onChange} required
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="text" name="employeeId" placeholder="Employee ID" value={data.employeeId} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="email" name="email" placeholder="Email address" value={data.email} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="tel" name="phone" placeholder="Phone number" value={data.phone} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <select name="trade" value={data.trade} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">Select trade</option>
          {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="status" value={data.status} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <input type="text" name="skills" placeholder="Skills, comma separated" value={data.skills} onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="text" name="assignedProject" placeholder="Assigned project" value={data.assignedProject} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="date" name="startDate" placeholder="Start date" value={data.startDate} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </div>
      <input type="text" name="address" placeholder="Address" value={data.address} onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      <div className="grid gap-4 sm:grid-cols-2">
        <input type="text" name="emergencyContactName" placeholder="Emergency contact name" value={data.emergencyContactName} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        <input type="tel" name="emergencyContactPhone" placeholder="Emergency contact phone" value={data.emergencyContactPhone} onChange={onChange}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </div>
      {fe && <p className="text-sm text-red-500">{fe}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
          {busy ? "Saving..." : "Save Worker"}
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
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "error" ? "bg-red-500" : toast.type === "info" ? "bg-blue-500" : "bg-green-500"}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Workers</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Manage team members, certifications, attendance, and performance notes.</p>
        </div>
        <button onClick={() => setShowForm((p) => !p)}
          className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
          {showForm ? "Close Form" : "+ Add Worker"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Workers", value: workers.length, cls: "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", textCls: "text-gray-800 dark:text-white/90" },
          { label: "Active", value: activeCount, cls: "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-500/10", textCls: "text-green-700 dark:text-green-300" },
          { label: "On Leave", value: onLeaveCount, cls: "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-500/10", textCls: "text-blue-700 dark:text-blue-300" },
          { label: "Portal Linked", value: `${linkedCount} / ${workers.length}`, cls: "border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-500/10", textCls: "text-indigo-700 dark:text-indigo-300" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-5 ${s.cls}`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${s.textCls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Add Worker</h2>
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
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Edit Worker</h2>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <FormFields data={editForm} onChange={handleEditChange} error={editError} submitting={editSubmitting} onCancel={closeEditModal} />
            </form>
          </div>
        </div>
      )}

      {/* Filters + list */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <input type="text" placeholder="Search by name, trade, project, ID…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="All">All Trades</option>
            {allTrades.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredWorkers.length === 0 ? "No workers match your filters" : (
            <>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredWorkers.length)} of {filteredWorkers.length} workers</>
          )}
        </p>
        {actionError && <p className="mb-4 text-sm text-red-500">{actionError}</p>}
        {loading && <p className="py-6 text-sm text-gray-500 dark:text-gray-400">Loading workers…</p>}
        {error && <p className="py-6 text-sm text-red-500">{error}</p>}

        {!loading && !error && workers.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">No workers yet. Add your first team member.</p>
          </div>
        )}

        {!loading && !error && filteredWorkers.length === 0 && workers.length > 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">No workers match your filters.</p>
          </div>
        )}

        {!loading && !error && filteredWorkers.length > 0 && (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {["Worker", "Trade", "Status", "Project", "Start Date", "Portal", "Actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedWorkers.map((worker) => (
                  <tr key={worker._id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(worker.name)}`}>
                          {worker.avatarInitials || getInitials(worker.name)}
                        </div>
                        <div>
                          <button onClick={() => openDrawer(worker)} className="text-sm font-medium text-gray-800 hover:text-brand-500 dark:text-white/90">
                            {worker.name}
                          </button>
                          {worker.employeeId && <p className="text-xs text-gray-400">ID: {worker.employeeId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{worker.trade || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyles(worker.status)}`}>{worker.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{worker.assignedProject || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(worker.startDate)}</td>
                    <td className="px-4 py-3">
                      {worker.userId
                        ? <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">Linked</span>
                        : <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">Not linked</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openDrawer(worker)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]">
                          View
                        </button>
                        <button onClick={() => openEditModal(worker)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]">
                          Edit
                        </button>
                        <button onClick={() => worker._id && handleDelete(worker._id)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          </>
        )}
      </div>

      {/* Worker detail drawer */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}>
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="relative ml-auto flex h-full w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${getAvatarColor(selectedWorker.name)}`}>
                {selectedWorker.avatarInitials || getInitials(selectedWorker.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-gray-800 dark:text-white/90">{selectedWorker.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedWorker.trade || "No trade set"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyles(selectedWorker.status)}`}>{selectedWorker.status}</span>
              <button onClick={closeDrawer} className="shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
            </div>

            {/* Drawer tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              {(["profile", "certifications", "attendance", "notes"] as const).map((tab) => (
                <button key={tab} onClick={() => setDrawerTab(tab)}
                  className={`flex-1 px-2 py-3 text-xs font-medium capitalize ${drawerTab === tab ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {drawerError && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{drawerError}</p>}

              {drawerTab === "profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedWorker.employeeId && <div><p className="text-xs text-gray-500 dark:text-gray-400">Employee ID</p><p className="font-medium text-gray-800 dark:text-white/90">{selectedWorker.employeeId}</p></div>}
                    {selectedWorker.email && <div><p className="text-xs text-gray-500 dark:text-gray-400">Email</p><p className="font-medium text-gray-800 dark:text-white/90 truncate">{selectedWorker.email}</p></div>}
                    {selectedWorker.phone && <div><p className="text-xs text-gray-500 dark:text-gray-400">Phone</p><p className="font-medium text-gray-800 dark:text-white/90">{selectedWorker.phone}</p></div>}
                    {selectedWorker.assignedProject && <div><p className="text-xs text-gray-500 dark:text-gray-400">Assigned Project</p><p className="font-medium text-gray-800 dark:text-white/90">{selectedWorker.assignedProject}</p></div>}
                    {selectedWorker.startDate && <div><p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p><p className="font-medium text-gray-800 dark:text-white/90">{formatDate(selectedWorker.startDate)}</p></div>}
                  </div>
                  {selectedWorker.address && (
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Address</p><p className="text-sm font-medium text-gray-800 dark:text-white/90">{selectedWorker.address}</p></div>
                  )}
                  {selectedWorker.skills.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorker.skills.map((s) => <span key={s} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-white/[0.07] dark:text-gray-300">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {(selectedWorker.emergencyContactName || selectedWorker.emergencyContactPhone) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-500/10">
                      <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-400">Emergency Contact</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{selectedWorker.emergencyContactName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedWorker.emergencyContactPhone}</p>
                    </div>
                  )}
                  <div className={`rounded-xl border p-4 ${selectedWorker.userId ? "border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-500/10" : "border-dashed border-gray-200 dark:border-gray-800"}`}>
                    <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Worker Portal Account</p>
                    {selectedWorker.userId ? (
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">Account linked — this worker can sign in at the worker portal.</p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Not linked yet.{selectedWorker.email ? ` Share the worker portal with them and ask them to sign up using ${selectedWorker.email}.` : " Add an email address so they can register at the worker portal."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === "certifications" && (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add certification</p>
                    <input type="text" placeholder="Certification name *" value={newCertName} onChange={(e) => setNewCertName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <input type="text" placeholder="Issued by" value={newCertIssuer} onChange={(e) => setNewCertIssuer(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" placeholder="Issue date" value={newCertIssueDate} onChange={(e) => setNewCertIssueDate(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                      <input type="date" placeholder="Expiry date" value={newCertExpiry} onChange={(e) => setNewCertExpiry(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    </div>
                    <button onClick={handleAddCertification}
                      className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Add Certification</button>
                  </div>
                  {selectedWorker.certifications.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No certifications yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedWorker.certifications.map((cert) => {
                        const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                        return (
                          <div key={cert.id} className={`rounded-xl border p-4 ${isExpired ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-500/10" : "border-gray-200 dark:border-gray-800"}`}>
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{cert.name}</p>
                              {isExpired && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-500/15 dark:text-red-400">Expired</span>}
                            </div>
                            {cert.issuedBy && <p className="text-xs text-gray-500 dark:text-gray-400">Issued by: {cert.issuedBy}</p>}
                            <div className="mt-1 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                              {cert.issueDate && <span>Issued: {formatDate(cert.issueDate)}</span>}
                              {cert.expiryDate && <span>Expires: {formatDate(cert.expiryDate)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {drawerTab === "attendance" && (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Log attendance</p>
                    <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <select value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value as typeof attendanceStatus)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                      {["Present", "Absent", "Late", "Half Day"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="time" placeholder="Check in" value={attendanceCheckIn} onChange={(e) => setAttendanceCheckIn(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                      <input type="time" placeholder="Check out" value={attendanceCheckOut} onChange={(e) => setAttendanceCheckOut(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    </div>
                    <input type="text" placeholder="Project / site" value={attendanceProject} onChange={(e) => setAttendanceProject(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <button onClick={handleLogAttendance}
                      className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Log Attendance</button>
                  </div>
                  {drawerAttendanceLoading ? (
                    <p className="py-4 text-center text-sm text-gray-400">Loading attendance…</p>
                  ) : drawerAttendance.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No attendance records.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800">
                            {["Date", "Status", "Check In", "Check Out", "Hours", "Project"].map((h) => (
                              <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {drawerAttendance.map((rec) => (
                            <tr key={rec._id}>
                              <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300">{formatDate(rec.date)}</td>
                              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${rec.status === "Present" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : rec.status === "Absent" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" : rec.status === "Late" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"}`}>{rec.status}</span></td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{rec.checkIn || "—"}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{rec.checkOut || "—"}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{rec.hoursWorked > 0 ? `${rec.hoursWorked}h` : "—"}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{rec.project || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === "notes" && (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <input type="text" placeholder="Your name" value={noteAuthor} onChange={(e) => setNoteAuthor(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <textarea rows={3} placeholder="Add a performance note…" value={noteInput} onChange={(e) => setNoteInput(e.target.value)}
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <button onClick={handleAddNote}
                      className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Add Note</button>
                  </div>
                  {selectedWorker.notes.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...selectedWorker.notes].reverse().map((note) => (
                        <div key={note.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{note.author}</p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{note.message}</p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{new Date(note.createdAt).toLocaleString("en-GB")}</p>
                        </div>
                      ))}
                    </div>
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
