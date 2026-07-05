/**
 * Platform shaft tuning — SSOT for press-shaft generators (PS-003).
 * Worklet-safe: plain numbers only.
 *
 * ## Press timing (visual tweak guide)
 *
 * Two knobs per hazard group:
 *
 * 1. **When press starts** — `*_TELEGRAPH_*` = rows of runway before the slab row.
 *    Composer sets `animStartRow = slabRow − telegraphRows`.
 *    At runtime, clock opens when water beat crosses that row.
 *    **Seconds of telegraph** ≈ `telegraphRows × (blockHeight / raisingSpeed)`.
 *    Example: 3 rows @ 400 px/s, 60 px blocks → 3 × 0.15s = **0.45s** before slab row.
 *
 * 2. **How long full extension takes** — `*_DURATION_*` = `pressDurationSec` (seconds, wall clock).
 *    Easing curve is per-event in composePressIntroShaft (`ease-out`, `ease-in`, …).
 *
 * Scroll speed (`raisingSpeed` on SwimmerGameComp / App.tsx) scales row-time only, not duration sec.
 *
 * Per-hazard overrides: composePressIntroShaft `animStartLocalRow` on stack/climax events.
 */

export const platformShaftTuning = {
  /** Minimum open columns at full press on 6-col grid (PS-003). */
  MIN_RESIDUAL_GAP_COLS: 1,

  /** Default atomic teach recipe (pressTeachSingle — tests only). */
  TEACH_APPROACH_ROWS: 5,
  TEACH_SLAB_ROW_SPAN: 3,
  TEACH_RECOVERY_ROWS: 4,
  TEACH_GAP_WIDTH_COLS: 2,
  TEACH_PRESS_COLS: 1,
  TEACH_PRESS_DURATION_SEC: 1.4,
  TEACH_TELEGRAPH_LEAD_ROWS: 2,
  TEACH_HELD_DURATION_SEC: 0.25,

  /** composePressIntroShaft — easy end (difficulty01 = 0). */
  INTRO_SHAFT_SAFE_RUNWAY_ROWS_EASY: 8,
  INTRO_SHAFT_SAFE_RUNWAY_ROWS_HARD: 6,
  INTRO_SHAFT_BREATHE_ROWS_EASY: 5,
  INTRO_SHAFT_BREATHE_ROWS_HARD: 3,
  INTRO_SHAFT_CHICANE_ROWS_EASY: 4,
  INTRO_SHAFT_CHICANE_ROWS_HARD: 3,
  INTRO_SHAFT_RELEASE_ROWS_EASY: 10,
  INTRO_SHAFT_RELEASE_ROWS_HARD: 5,
  INTRO_SHAFT_PRESS1_DURATION_EASY: 1.2,
  INTRO_SHAFT_PRESS1_DURATION_HARD: 1.05,
  INTRO_SHAFT_PRESS1_TELEGRAPH_EASY: 0,
  INTRO_SHAFT_PRESS1_TELEGRAPH_HARD: 0,
  INTRO_SHAFT_PRESS2_DURATION_EASY: 1.2,
  INTRO_SHAFT_PRESS2_DURATION_HARD: 0.95,
  INTRO_SHAFT_PRESS2_TELEGRAPH_EASY: 0,
  INTRO_SHAFT_PRESS2_TELEGRAPH_HARD: 0,
  INTRO_SHAFT_STACK_DURATION_EASY: 1.0,
  INTRO_SHAFT_STACK_DURATION_HARD: 0.8,
  INTRO_SHAFT_STACK_TELEGRAPH_ROWS: 2,
  INTRO_SHAFT_CLIMAX_DURATION_EASY: 0.85,
  INTRO_SHAFT_CLIMAX_DURATION_HARD: 0.75,
  INTRO_SHAFT_CLIMAX_TELEGRAPH_EASY: 1,
  INTRO_SHAFT_CLIMAX_TELEGRAPH_HARD: 0,
  INTRO_SHAFT_HAZARD_COUNT: 5,

  /** Machinery slab fill — distinct from orange clay (SH-011). */
  PLATFORM_SLAB_STEEL_COLOR: '#A8B8C4',

  /** Platform press lateral flow (PS-007). */
  FLOW_BASE_GAIN: 0.85,
  FLOW_MAX_NORM: 1.25,
  FLOW_ROW_SPAN_NORM: 3,

  /** Couples mergeRowHazardPass platform flow into water surface tilt/offset (Slice A). */
  FLOW_SURFACE_GAIN: 1.0,
  /** Extra surge pop while slab is actively pressing on the center row. */
  FLOW_SURFACE_SURGE_BUMP: 1.4,
  /** Asymmetric surface lean UV gain (shader + waterSurfaceProfile parity). */
  FLOW_SURFACE_LEAN_UV: 0.1,
} as const;
