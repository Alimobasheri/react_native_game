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

  /** pressPinballPair — TENSION bounce (Slice 4). */
  PINBALL_RUNWAY_ROWS_EASY: 6,
  PINBALL_RUNWAY_ROWS_HARD: 4,
  PINBALL_BREATHE_ROWS_EASY: 5,
  PINBALL_BREATHE_ROWS_HARD: 3,
  PINBALL_CHICANE_ROWS_EASY: 3,
  PINBALL_CHICANE_ROWS_HARD: 2,
  PINBALL_RELEASE_ROWS_EASY: 8,
  PINBALL_RELEASE_ROWS_HARD: 5,
  PINBALL_PRESS1_ROW_SPAN: 3,
  PINBALL_PRESS2_ROW_SPAN: 2,
  PINBALL_PRESS1_DURATION_EASY: 1.2,
  PINBALL_PRESS1_DURATION_HARD: 1.05,
  PINBALL_PRESS2_DURATION_EASY: 1.15,
  PINBALL_PRESS2_DURATION_HARD: 0.9,
  PINBALL_PRESS1_TELEGRAPH_EASY: 0,
  PINBALL_PRESS1_TELEGRAPH_HARD: 0,
  PINBALL_PRESS2_TELEGRAPH_EASY: 0,
  PINBALL_PRESS2_TELEGRAPH_HARD: 0,

  /** Machinery slab fill — distinct from orange clay (SH-011). */
  PLATFORM_SLAB_STEEL_COLOR: '#A8B8C4',

  /** Platform press lateral flow (PS-007). */
  FLOW_BASE_GAIN: 0.42,
  FLOW_MAX_NORM: 1.25,
  FLOW_ROW_SPAN_NORM: 3,

  /** Couples mergeRowHazardPass platform flow into water surface tilt/offset (Slice A). */
  FLOW_SURFACE_GAIN: 1.0,
  /** Extra surge pop while slab is actively pressing on the center row. */
  FLOW_SURFACE_SURGE_BUMP: 1.4,
  /** Asymmetric surface lean UV gain (shader + waterSurfaceProfile parity). */
  FLOW_SURFACE_LEAN_UV: 0.1,

  // --- Path v2 (platform-shaft-path-v2-spec.md) ---

  /** Unextended corridor width at difficulty 0 / 1 (cols). */
  WIDE_GAP_COLS_EASY: 4,
  WIDE_GAP_COLS_HARD: 3,
  /** Full-press target width (PS-003). */
  NARROW_GAP_COLS: 1,
  /** Extra rows beyond swimmer-height clearance for barely-clear timing. */
  CLEARANCE_MARGIN_ROWS: 1,
  TELEGRAPH_ROWS_EASY: 3,
  TELEGRAPH_ROWS_HARD: 1,
  STACK_STAGGER_ROWS_EASY: 1,
  STACK_STAGGER_ROWS_HARD: 0,
  /** Multiplier on pressDurationRows (>1 = slower / more rows). */
  SPEED_TIER_SLOW: 1.25,
  SPEED_TIER_NORM: 1.0,
  /** Multiplier on pressDurationRows (<1 = faster / fewer rows). */
  SPEED_TIER_FAST: 0.75,
  /** Seeded probability of ceiling pin between shaft groups. */
  CEILING_PIN_CHANCE: 0.15,
  /** Minimum wide rows before a ceiling pin (floor; scales up with pin block count). */
  CEILING_PIN_LEAD_ROWS: 4,
  /** Extra approach rows per push-side pin block (2-block pin → 4-row runway). */
  CEILING_APPROACH_ROWS_PER_PIN_BLOCK: 2,
  /** Wide rows before path center shifts at segment tail (slide-out runway). */
  SEGMENT_CORRIDOR_SHIFT_LEAD_ROWS: 4,
  /** Trailing approach rows with zero steel — full wide gaps only. */
  CEILING_APPROACH_PURE_ESCAPE_ROWS: 2,
  /** Min open gap cols on rows leading into a ceiling pin (flow escape runway). */
  CEILING_APPROACH_MIN_OPEN_COLS: 4,
  /** Wide rows per column of lateral gap-center shift (chicane / directed parity). */
  GAP_SHIFT_ROWS_PER_COL: 3,
  /** Min open gap cols to count as gap-shift runway. */
  GAP_SHIFT_MIN_OPEN_COLS: 3,
  /** Min build rows per segment before release (escalate to 1-col). */
  SHAFT_BUILD_ROWS_MIN_EASY: 5,
  SHAFT_BUILD_ROWS_MIN_HARD: 3,
  /** Rows to hold max 1-col press at stack peak. */
  SHAFT_PEAK_HOLD_ROWS: 2,
  RHYTHM_PROFILE_DEFAULT_DENSITY: 0.85,
  RHYTHM_PROFILE_POST_PIN_DENSITY: 1.0,
  /** Default chicane path preview row count (P1 lab / Storybook). */
  PATH_CHICANE_PREVIEW_ROWS: 40,
  /** First N rows: wide path only, no steel (teach runway). */
  PATH_SHAFT_START_ROW: 8,
} as const;
