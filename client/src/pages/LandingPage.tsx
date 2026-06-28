import { Link } from "react-router-dom";

const CheckIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ArrowIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 font-bold text-white text-sm shadow-sm shadow-brand-500/30">
              S
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-gray-900 dark:text-white">SiteTrack</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Site Management</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              to="/utilities"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:block"
            >
              Free tools
            </Link>
            <Link
              to="/worker/signin"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:block"
            >
              Worker Login
            </Link>
            <Link
              to="/signin"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Manager Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
            >
              Sign Up Free
            </Link>
          </nav>
        </div>
      </header>

      <main>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="border-b border-gray-100 py-20 dark:border-gray-800">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <span className="mb-5 inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
              Construction site management
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl xl:text-6xl">
              One platform.{" "}
              <span className="text-brand-500">Two connected</span>{" "}
              experiences.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Managers assign work, track progress, and run their sites. Workers
              check in, update tasks, and stay informed. Both sides connect in
              real time through one shared system.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/signup"
                className="w-full rounded-xl bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 sm:w-auto"
              >
                Get started as a manager
              </Link>
              <Link
                to="/worker/signup"
                className="w-full rounded-xl border border-gray-300 px-8 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 sm:w-auto"
              >
                Join as a worker
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Already have an account?{" "}
              <Link to="/signin" className="text-brand-500 hover:underline">Manager login</Link>
              {" · "}
              <Link to="/worker/signin" className="text-brand-500 hover:underline">Worker login</Link>
            </p>
          </div>
        </section>

        {/* ── Free tools ──────────────────────────────────────────────────── */}
        <section className="border-b border-gray-100 bg-gray-50 py-16 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mx-auto max-w-6xl px-6">

            <div className="mb-10 text-center">
              <span className="mb-3 inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
                Free tools
              </span>
              <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                Construction calculators — use them now, free
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
                Practical estimating tools for site managers, quantity surveyors, and engineers.
                No sign-in required.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              <Link
                to="/utilities/brick-calculator"
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-lg dark:bg-orange-900/20">
                  🧱
                </div>
                <span className="mb-2 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-orange-900/20 dark:text-brand-400">
                  Estimating
                </span>
                <h3 className="mt-2 text-base font-semibold text-gray-900 group-hover:text-brand-500 dark:text-white">
                  Brick Calculator
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Bricks and mortar bags for stretcher, English, Flemish, and cavity walls.
                  Based on UK standard brick dimensions.
                </p>
                <p className="mt-4 text-xs font-medium text-brand-500 group-hover:underline">
                  Open calculator →
                </p>
              </Link>

              <Link
                to="/utilities/concrete-calculator"
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-800">
                  🏗️
                </div>
                <span className="mb-2 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-orange-900/20 dark:text-brand-400">
                  Estimating
                </span>
                <h3 className="mt-2 text-base font-semibold text-gray-900 group-hover:text-brand-500 dark:text-white">
                  Concrete Calculator
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Volume for slabs, strip footings, and circular columns. Returns m³
                  and 25 kg premix bag count with waste allowance.
                </p>
                <p className="mt-4 text-xs font-medium text-brand-500 group-hover:underline">
                  Open calculator →
                </p>
              </Link>

              <Link
                to="/utilities"
                className="group flex flex-col justify-between rounded-2xl border border-dashed border-gray-300 bg-white p-6 transition hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500"
              >
                <div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-800">
                    ＋
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-500 dark:text-white">
                    More tools coming
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    Paint coverage, roof tiles, floor screed, and more estimating calculators on the way.
                  </p>
                </div>
                <p className="mt-4 text-xs font-medium text-brand-500 group-hover:underline">
                  Browse all tools →
                </p>
              </Link>

            </div>
          </div>
        </section>

        {/* ── Split portal cards ──────────────────────────────────────────── */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Two portals. One system.</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Each role has its own experience built for how they actually work.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">

              {/* Manager card */}
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 p-8 text-white dark:border-gray-700">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-brand-500/10" />
                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gray-300">
                    For Managers &amp; Admins
                  </span>

                  <h3 className="mt-5 text-2xl font-bold text-white">Run your sites with full visibility</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">
                    Create projects, assign tasks, and track every worker and deadline from one admin dashboard.
                  </p>

                  <ul className="mt-6 space-y-3">
                    {[
                      "Create and manage construction projects",
                      "Assign tasks to workers and track progress",
                      "Monitor site attendance and check-ins",
                      "View worker updates as they happen",
                      "Generate reports and track completion rates",
                      "Manage worker profiles and certifications",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/signup"
                      className="flex-1 rounded-xl bg-brand-500 py-3 text-center text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      Create Manager Account
                    </Link>
                    <Link
                      to="/signin"
                      className="flex-1 rounded-xl border border-white/20 py-3 text-center text-sm font-semibold text-gray-200 hover:bg-white/5"
                    >
                      Manager Login
                    </Link>
                  </div>
                </div>
              </div>

              {/* Worker card */}
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-brand-500/5" />
                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    For Workers &amp; Assignees
                  </span>

                  <h3 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">Know your work. Own your day.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    See your assigned tasks, check in from site, and keep your manager updated — all from your phone.
                  </p>

                  <ul className="mt-6 space-y-3">
                    {[
                      "See all tasks assigned to you",
                      "Check in daily and log your attendance",
                      "Update task status and submit progress notes",
                      "View your site and project information",
                      "Track your attendance and work history",
                      "Manage your worker profile and details",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <CheckIcon />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/worker/signup"
                      className="flex-1 rounded-xl bg-gray-900 py-3 text-center text-sm font-semibold text-white hover:bg-gray-800 dark:bg-brand-500 dark:hover:bg-brand-600"
                    >
                      Join as a Worker
                    </Link>
                    <Link
                      to="/worker/signin"
                      className="flex-1 rounded-xl border border-gray-300 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Worker Login
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section className="border-y border-gray-100 bg-gray-50 py-16 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How the two sides connect</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Every action on one side is visible to the other. That's what makes it one system.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-5 md:items-center">

              {/* Step 1 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">1</div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Manager</p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Creates a project and assigns tasks</h3>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Adds projects, sets deadlines, and assigns tasks to workers by name.</p>
              </div>

              <div className="flex justify-center">
                <ArrowIcon />
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 text-sm font-bold text-white dark:bg-brand-500">2</div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-brand-400">Worker</p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Logs in and sees assigned work</h3>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Opens the worker portal, checks in, and views all tasks assigned to them.</p>
              </div>

              <div className="flex justify-center">
                <ArrowIcon />
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">3</div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Manager</p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Sees updates in real time</h3>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Task status changes, check-ins, and notes appear instantly in the manager dashboard.</p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Platform features ───────────────────────────────────────────── */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Everything a construction team needs</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Built for real site operations — not generic project management.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Task tracking",
                  desc: "Create, assign, and monitor site tasks with status, priority, and deadlines. Workers update progress from their portal.",
                  icon: "✓",
                  color: "bg-blue-50 dark:bg-blue-500/10",
                  iconColor: "bg-blue-500",
                },
                {
                  title: "Project management",
                  desc: "Track multiple construction projects with milestones, progress bars, budget, and activity logs.",
                  icon: "◈",
                  color: "bg-green-50 dark:bg-green-500/10",
                  iconColor: "bg-green-500",
                },
                {
                  title: "Worker coordination",
                  desc: "Manage your field team — trades, certifications, assignments, availability, and contact information.",
                  icon: "⬡",
                  color: "bg-purple-50 dark:bg-purple-500/10",
                  iconColor: "bg-purple-500",
                },
                {
                  title: "Attendance and check-in",
                  desc: "Workers check in from site each day. Managers see the full attendance log with hours and project assignments.",
                  icon: "◷",
                  color: "bg-orange-50 dark:bg-orange-500/10",
                  iconColor: "bg-orange-500",
                },
                {
                  title: "Reports and analytics",
                  desc: "Completion rates, task breakdowns, worker activity, and project health — all in one reporting view.",
                  icon: "↗",
                  color: "bg-amber-50 dark:bg-amber-500/10",
                  iconColor: "bg-amber-500",
                },
                {
                  title: "Schedule and calendar",
                  desc: "Visual calendar with work items, site events, and deadline tracking for both managers and workers.",
                  icon: "▦",
                  color: "bg-indigo-50 dark:bg-indigo-500/10",
                  iconColor: "bg-indigo-500",
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className={`rounded-2xl border border-gray-200 p-6 dark:border-gray-700 ${feat.color}`}
                >
                  <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white ${feat.iconColor}`}>
                    {feat.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{feat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <section className="border-t border-gray-100 bg-gray-900 py-16 dark:border-gray-800">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold text-white">Ready to connect your site team?</h2>
            <p className="mt-4 text-gray-400">
              Managers and workers in one system. Set up in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/signup"
                className="w-full rounded-xl bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-brand-600 sm:w-auto"
              >
                Get started as a manager
              </Link>
              <Link
                to="/worker/signup"
                className="w-full rounded-xl border border-white/20 px-8 py-3.5 text-sm font-semibold text-gray-200 hover:bg-white/5 sm:w-auto"
              >
                Join as a worker
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-8 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">S</div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">SiteTrack</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-400 dark:text-gray-500">
            <Link to="/signin" className="hover:text-gray-600 dark:hover:text-gray-300">Manager Login</Link>
            <Link to="/signup" className="hover:text-gray-600 dark:hover:text-gray-300">Manager Sign Up</Link>
            <Link to="/worker/signin" className="hover:text-gray-600 dark:hover:text-gray-300">Worker Login</Link>
            <Link to="/worker/signup" className="hover:text-gray-600 dark:hover:text-gray-300">Worker Sign Up</Link>
            <Link to="/utilities" className="hover:text-gray-600 dark:hover:text-gray-300">Free Tools</Link>
          </nav>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} SiteTrack
          </p>
        </div>
      </footer>

    </div>
  );
}
