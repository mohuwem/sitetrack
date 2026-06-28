import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";

type Tool = {
  name:        string;
  description: string;
  href:        string;
  tag:         string;
};

const TOOLS: Tool[] = [
  {
    name:        "Brick Calculator",
    description: "Calculate bricks and mortar bags for stretcher, English, Flemish, and cavity walls. Based on UK standard brick dimensions (215 × 102.5 × 65mm).",
    href:        "/utilities/brick-calculator",
    tag:         "Estimating",
  },
];

export default function UtilitiesHub() {
  return (
    <>
      <PageMeta
        title="Free Construction Calculators | SiteTrack"
        description="Free online construction calculators for site managers, quantity surveyors, and engineers. Brick, mortar, and more. No sign-in required."
      />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-bold text-brand-500">
            SiteTrack
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/signin"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl">

          {/* Hero */}
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-medium text-brand-500">Free tools</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Construction Calculators
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
              Practical estimating tools for site managers, quantity surveyors, and engineers.
              No sign-in required.
            </p>
          </div>

          {/* Tool grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                to={tool.href}
                className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-400 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500"
              >
                <span className="mb-3 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-orange-900/20 dark:text-brand-400">
                  {tool.tag}
                </span>
                <h2 className="mb-1 text-base font-semibold text-gray-900 group-hover:text-brand-500 dark:text-white">
                  {tool.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tool.description}
                </p>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-14 rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Managing a construction site?
            </h2>
            <p className="mx-auto mb-6 max-w-md text-gray-500 dark:text-gray-400">
              SiteTrack gives you tasks, attendance, daily reports, and team management — all in one place.
            </p>
            <Link
              to="/signup"
              className="inline-block rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Start free — no card required
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
