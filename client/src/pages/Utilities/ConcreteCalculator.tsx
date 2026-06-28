import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConcreteShape = "slab" | "footing" | "column";

const SHAPES: { value: ConcreteShape; label: string; hint: string }[] = [
  {
    value: "slab",
    label: "Slab / floor",
    hint:  "Flat rectangular pour — floors, paths, driveways, hardstandings",
  },
  {
    value: "footing",
    label: "Strip footing",
    hint:  "Continuous trench footing — wall foundations, pad-and-beam bases",
  },
  {
    value: "column",
    label: "Circular column",
    hint:  "Round post, pier, or column — fence posts, structural columns",
  },
];

type Result = {
  volumeNet:   number; // m³ before waste
  volumeOrder: number; // m³ with waste added
  bags25kg:    number; // 25 kg premix bags needed
};

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

// 1 × 25 kg bag of premix concrete yields ≈ 0.012 m³ of mixed concrete
const BAG_YIELD_M3 = 0.012;

function calculate(
  shape:    ConcreteShape,
  dim1:     number, // length (rect) | diameter (column)
  dim2:     number, // width  (rect) | height   (column)
  dim3:     number, // depth  (rect) | unused   (column)
  wastePct: number,
): Result | null {
  let volumeNet: number;

  if (shape === "column") {
    if (dim1 <= 0 || dim2 <= 0) return null;
    const r = dim1 / 2;
    volumeNet = Math.PI * r * r * dim2;
  } else {
    if (dim1 <= 0 || dim2 <= 0 || dim3 <= 0) return null;
    volumeNet = dim1 * dim2 * dim3;
  }

  const volumeOrder = volumeNet * (1 + wastePct / 100);
  const bags25kg    = Math.ceil(volumeOrder / BAG_YIELD_M3);
  return { volumeNet, volumeOrder, bags25kg };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const n3 = (v: number) => v.toFixed(3);
const n0 = (v: number) => v.toLocaleString("en-GB");

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConcreteCalculator() {
  const [shape,     setShape]     = useState<ConcreteShape>("slab");
  const [length,    setLength]    = useState("5");
  const [width,     setWidth]     = useState("5");
  const [depth,     setDepth]     = useState("0.15");
  const [diameter,  setDiameter]  = useState("0.3");
  const [colHeight, setColHeight] = useState("3");
  const [wastePct,  setWastePct]  = useState(10);

  const isRect = shape === "slab" || shape === "footing";

  const result = useMemo(() => {
    if (isRect) {
      return calculate(
        shape,
        parseFloat(length),
        parseFloat(width),
        parseFloat(depth),
        wastePct,
      );
    }
    return calculate(
      shape,
      parseFloat(diameter),
      parseFloat(colHeight),
      0,
      wastePct,
    );
  }, [shape, length, width, depth, diameter, colHeight, wastePct, isRect]);

  const shapeHint = SHAPES.find((s) => s.value === shape)?.hint ?? "";

  return (
    <>
      <PageMeta
        title="Concrete Calculator | SiteTrack"
        description="Free concrete volume calculator for slabs, strip footings, and circular columns. Calculates m³ and 25 kg premix bags. No sign-in required."
      />

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
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

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <main className="min-h-screen bg-gray-50 py-10 px-4 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl">

          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              to="/utilities"
              className="text-sm text-brand-500 hover:underline"
            >
              ← All tools
            </Link>
          </div>

          {/* Page title */}
          <div className="mb-8">
            <p className="mb-1 text-sm font-medium text-brand-500">Free calculator</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Concrete Calculator
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Volume of concrete for slabs, strip footings, and circular columns.
              Enter dimensions in metres — get m³ and bag counts instantly.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

            {/* -------------------------------------------------------------- */}
            {/* Inputs                                                           */}
            {/* -------------------------------------------------------------- */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Pour details
              </h2>

              <div className="grid gap-5 sm:grid-cols-2">

                {/* Pour type */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pour type
                  </label>
                  <select
                    value={shape}
                    onChange={(e) => setShape(e.target.value as ConcreteShape)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {SHAPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{shapeHint}</p>
                </div>

                {/* Rectangular inputs (slab / footing) */}
                {isRect && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {shape === "footing" ? "Footing length (m)" : "Length (m)"}
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.1"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {shape === "footing" ? "Footing width (m)" : "Width (m)"}
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.05"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {shape === "footing" ? "Footing depth (m)" : "Slab thickness (m)"}
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={depth}
                        onChange={(e) => setDepth(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {/* Circular column inputs */}
                {!isRect && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Diameter (m)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.05"
                        value={diameter}
                        onChange={(e) => setDiameter(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Height (m)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.1"
                        value={colHeight}
                        onChange={(e) => setColHeight(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {/* Waste */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Waste allowance
                  </label>
                  <select
                    value={wastePct}
                    onChange={(e) => setWastePct(Number(e.target.value))}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value={5}>5% — Accurate formwork, simple shape</option>
                    <option value={10}>10% — Standard allowance</option>
                    <option value={15}>15% — Uneven ground or complex shape</option>
                  </select>
                </div>
              </div>

              {/* Assumptions */}
              <div className="mt-6 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Assumptions
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-xs text-gray-400 dark:text-gray-500">
                  <li>All dimensions in metres</li>
                  <li>Circular column uses π × r² × height</li>
                  <li>Premix bag yield: 1 × 25 kg bag ≈ 0.012 m³ mixed concrete</li>
                  <li>No deductions for rebar, pipes, or embedded items</li>
                  <li>For pours over 1 m³ consider ordering ready-mix instead of bags</li>
                </ul>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Results                                                          */}
            {/* -------------------------------------------------------------- */}
            <div className="flex flex-col gap-4">
              {result ? (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Estimate
                    </p>

                    <div className="space-y-3">
                      <Row label="Volume (net)" value={`${n3(result.volumeNet)} m³`} />

                      <div className="border-t border-gray-100 pt-3 dark:border-gray-800" />

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Volume to order
                          </span>
                          <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                            +{wastePct}% waste
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-brand-500">
                          {n3(result.volumeOrder)} m³
                        </span>
                      </div>

                      <div className="border-t border-gray-100 pt-3 dark:border-gray-800" />

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Bags (25 kg)
                          </span>
                          <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                            approx.
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-brand-500">
                          {n0(result.bags25kg)}
                        </span>
                      </div>

                      {result.volumeOrder >= 1 && (
                        <div className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          Over 1 m³ — consider ordering ready-mix rather than bags.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-white">
                      Running a construction site?
                    </p>
                    <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                      SiteTrack helps site managers track tasks, workers,
                      materials, and daily progress in one place.
                    </p>
                    <Link
                      to="/signup"
                      className="block rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-600"
                    >
                      Start free — no card required
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Enter dimensions to see your estimate
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small helper: label / value row in the results card
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
