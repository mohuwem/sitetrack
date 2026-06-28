import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../lib/api";

type TaskResult    = { _id: string; title: string; site: string; status: string; priority: string };
type ProjectResult = { _id: string; name: string; status: string; manager: string };
type WorkerResult  = { _id: string; name: string; trade: string; status: string };

type Results = { tasks: TaskResult[]; projects: ProjectResult[]; workers: WorkerResult[] };

const EMPTY: Results = { tasks: [], projects: [], workers: [] };

function hasResults(r: Results) {
  return r.tasks.length > 0 || r.projects.length > 0 || r.workers.length > 0;
}

// Flattened list for keyboard navigation
type NavItem = { label: string; sub: string; href: string };

function flatten(r: Results): NavItem[] {
  const items: NavItem[] = [];
  r.tasks.forEach((t)    => items.push({ label: t.title,   sub: t.site || t.status,  href: "/tasks"    }));
  r.projects.forEach((p) => items.push({ label: p.name,    sub: p.status,             href: "/projects" }));
  r.workers.forEach((w)  => items.push({ label: w.name,    sub: w.trade || w.status,  href: "/workers"  }));
  return items;
}

export default function SearchBar() {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Results>(EMPTY);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [cursor, setCursor]     = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate    = useNavigate();

  // ⌘K / Ctrl+K focuses the input
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close on click outside
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(EMPTY); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await authFetch(`/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch {
      // silent — don't break the header on search failure
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setCursor(-1);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const items = flatten(results);
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && cursor >= 0) {
      e.preventDefault();
      navigate(items[cursor].href);
      setOpen(false);
      setQuery("");
    }
  }

  function go(href: string) {
    navigate(href);
    setOpen(false);
    setQuery("");
  }

  const navItems = flatten(results);

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      {/* Input */}
      <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
        {loading ? (
          <svg className="animate-spin text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill="" />
          </svg>
        )}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search tasks, projects, or workers..."
        className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
      />
      <span className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 pointer-events-none">
        <span>⌘</span><span>K</span>
      </span>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[99999] w-full min-w-[320px] xl:w-[430px] rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          {!hasResults(results) && !loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No results for <span className="font-medium text-gray-600 dark:text-gray-300">"{query}"</span>
            </div>
          )}

          {results.tasks.length > 0 && (
            <Section label="Tasks">
              {results.tasks.map((t, i) => {
                const idx = navItems.findIndex((n) => n.label === t.title && n.href === "/tasks");
                return (
                  <ResultRow
                    key={t._id}
                    label={t.title}
                    sub={t.site}
                    badge={t.status}
                    active={cursor === idx}
                    onClick={() => go("/tasks")}
                  />
                );
              })}
            </Section>
          )}

          {results.projects.length > 0 && (
            <Section label="Projects">
              {results.projects.map((p) => {
                const idx = navItems.findIndex((n) => n.label === p.name && n.href === "/projects");
                return (
                  <ResultRow
                    key={p._id}
                    label={p.name}
                    sub={p.manager}
                    badge={p.status}
                    active={cursor === idx}
                    onClick={() => go("/projects")}
                  />
                );
              })}
            </Section>
          )}

          {results.workers.length > 0 && (
            <Section label="Workers">
              {results.workers.map((w) => {
                const idx = navItems.findIndex((n) => n.label === w.name && n.href === "/workers");
                return (
                  <ResultRow
                    key={w._id}
                    label={w.name}
                    sub={w.trade}
                    badge={w.status}
                    active={cursor === idx}
                    onClick={() => go("/workers")}
                  />
                );
              })}
            </Section>
          )}

          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span><kbd className="font-sans">↑↓</kbd> navigate</span>
            <span><kbd className="font-sans">↵</kbd> open</span>
            <span><kbd className="font-sans">Esc</kbd> close</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  label, sub, badge, active, onClick,
}: {
  label: string; sub: string; badge: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
        active
          ? "bg-brand-50 dark:bg-brand-500/10"
          : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{label}</p>
        {sub && <p className="truncate text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {badge}
        </span>
      )}
    </button>
  );
}
