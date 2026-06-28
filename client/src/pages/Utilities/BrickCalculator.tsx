import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WallType = "half-stretcher" | "full-english" | "full-flemish" | "cavity";

const WALL_TYPES: { value: WallType; label: string; thickness: string }[] = [
  { value: "half-stretcher", label: "Half brick — Stretcher bond",  thickness: "102.5mm" },
  { value: "full-english",   label: "One brick — English bond",     thickness: "215mm"   },
  { value: "full-flemish",   label: "One brick — Flemish bond",     thickness: "215mm"   },
  { value: "cavity",         label: "Cavity wall (two leaves)",     thickness: "≈275mm"  },
];

// Effective solid masonry thickness per wall type (metres).
// Cavity walls have two 102.5mm leaves; mortar does not fill the cavity.
const SOLID_THICKNESS: Record<WallType, number> = {
  "half-stretcher": 0.1025,
  "full-english":   0.215,
  "full-flemish":   0.215,
  "cavity":         0.205, // 2 × 0.1025 leaves
};

// Leaf multiplier: how many half-brick leaves make up the wall.
const LEAF_COUNT: Record<WallType, number> = {
  "half-stretcher": 1,
  "full-english":   2,
  "full-flemish":   2,
  "cavity":         2,
};

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

type Result = {
  area:         number;
  bricksNet:    number;
  bricksOrder:  number;
  mortarM3:     number;
  bags25kg:     number;
};

// Standard UK brick: 215 × 102.5 × 65mm
const BRICK_VOL_M3 = 0.215 * 0.1025 * 0.065; // 0.001433 m³

function calculate(
  lengthM:  number,
  heightM:  number,
  wallType: WallType,
  jointMm:  number,
  wastePct: number,
): Result | null {
  if (lengthM <= 0 || heightM <= 0) return null;

  const area = lengthM * heightM;
  const j    = jointMm / 1000; // joint in metres

  // Bricks per m² for a single half-brick leaf
  const nomL         = 0.215 + j;
  const nomH         = 0.065 + j;
  const bricksPerM2  = (1 / nomL) * (1 / nomH);

  const bricksNet   = Math.ceil(bricksPerM2 * LEAF_COUNT[wallType] * area);
  const bricksOrder = Math.ceil(bricksNet * (1 + wastePct / 100));

  // Mortar: total solid wall volume minus actual brick volume
  const solidVol   = area * SOLID_THICKNESS[wallType];
  const brickVol   = bricksNet * BRICK_VOL_M3;
  const mortarNet  = Math.max(0, solidVol - brickVol);
  const mortarM3   = mortarNet * (1 + wastePct / 100);

  // 1 × 25kg premix bag yields ≈ 0.011 m³ of mixed mortar
  const bags25kg = Math.ceil(mortarM3 / 0.011);

  return { area, bricksNet, bricksOrder, mortarM3, bags25kg };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const n0 = (v: number) => v.toLocaleString("en-GB");
const n3 = (v: number) => v.toFixed(3);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BrickCalculator() {
  const [length,   setLength]   = useState("5");
  const [height,   setHeight]   = useState("2.4");
  const [wallType, setWallType] = useState<WallType>("half-stretcher");
  const [jointMm,  setJointMm]  = useState(10);
  const [wastePct, setWastePct] = useState(10);

  const result = useMemo(() => {
    const l = parseFloat(length);
    const h = parseFloat(height);
    return calculate(l, h, wallType, jointMm, wastePct);
  }, [length, height, wallType, jointMm, wastePct]);

  return (
    <>
      <PageMeta
        title="Brick Calculator | SiteTrack"
        description="Free UK brick calculator. Calculate how many bricks and mortar bags you need for stretcher bond, English bond, Flemish bond, and cavity walls."
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

          {/* Page title */}
          <div className="mb-8">
            <p className="mb-1 text-sm font-medium text-brand-500">Free calculator</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Brick Calculator
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              How many bricks do you need? Enter your wall dimensions and get an
              instant estimate including mortar. Based on standard UK brick
              dimensions (215 × 102.5 × 65mm).
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

            {/* -------------------------------------------------------------- */}
            {/* Inputs                                                           */}
            {/* -------------------------------------------------------------- */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Wall details
              </h2>

              <div className="grid gap-5 sm:grid-cols-2">

                {/* Length */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wall length (m)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Height */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wall height (m)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Wall type */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wall type &amp; bond
                  </label>
                  <select
                    value={wallType}
                    onChange={(e) => setWallType(e.target.value as WallType)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {WALL_TYPES.map((wt) => (
                      <option key={wt.value} value={wt.value}>
                        {wt.label} ({wt.thickness})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Joint size */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mortar joint
                  </label>
                  <select
                    value={jointMm}
                    onChange={(e) => setJointMm(Number(e.target.value))}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value={8}>8mm — Thin joint</option>
                    <option value={10}>10mm — Standard</option>
                    <option value={12}>12mm — Wide joint</option>
                  </select>
                </div>

                {/* Waste */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Waste allowance
                  </label>
                  <select
                    value={wastePct}
                    onChange={(e) => setWastePct(Number(e.target.value))}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value={5}>5%</option>
                    <option value={10}>10% — Standard</option>
                    <option value={15}>15% — Complex cuts</option>
                  </select>
                </div>
              </div>

              {/* Assumptions */}
              <div className="mt-6 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Assumptions
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-xs text-gray-400 dark:text-gray-500">
                  <li>Standard UK brick: 215 × 102.5 × 65mm</li>
                  <li>Cavity wall: two 102.5mm leaves, mortar in leaves only</li>
                  <li>Mortar yield: 1 × 25kg premix bag ≈ 0.011m³</li>
                  <li>
                    No deductions for openings — subtract doors and windows
                    manually from your wall area
                  </li>
                </ul>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Results                                                          */}
            {/* -------------------------------------------------------------- */}
            <div className="flex flex-col gap-4">
              {result ? (
                <>
                  {/* Result card */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Estimate
                    </p>

                    <div className="space-y-3">
                      <Row label="Wall area" value={`${n3(result.area)} m²`} />

                      <div className="border-t border-gray-100 pt-3 dark:border-gray-800" />

                      <Row label="Bricks (net count)" value={n0(result.bricksNet)} />
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Bricks to order
                            </span>
                            <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                              +{wastePct}% waste
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-brand-500">
                            {n0(result.bricksOrder)}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3 dark:border-gray-800" />

                      <Row label="Mortar volume" value={`${n3(result.mortarM3)} m³`} />
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Mortar bags (25kg)
                            </span>
                            <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                              approx.
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-brand-500">
                            {result.bags25kg}
                          </span>
                        </div>
                      </div>
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
                    Enter wall dimensions to see your estimate
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
// Small helper: a single label / value row in the results card
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
