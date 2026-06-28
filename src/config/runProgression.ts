/**
 * Run-level progression tuning — blueprint pools, weights, and signature cadence.
 * Worklet-safe: plain constants + numeric weights only.
 *
 * Milestone-gated pool expansion — Phase 5 shipped (see run-level-progression.md).
 *
 * TODO(T-007): Persist `sessionSeed` via AsyncStorage on cold start so attempt #1
 * can use a real `runSeed` for cycle-1 pacing after app reopen (not per-session-only).
 */

export const runProgressionTuning = {
  /** Cycle index (1-based) of first forced signature beat; 0 = none this run. */
  FIRST_SIGNATURE_AT_CYCLE: 2,
  /** Every N completed macro cycles, force a signature beat. */
  SIGNATURE_EVERY_N_CYCLES: 2,
  /** Opening archetype routing applies to the first N spawned rows in FLOW. */
  OPENING_ARCHETYPE_MAX_ROWS: 14,
  /** fastChicane: chute rows before chicane (inclusive roll range). */
  FAST_CHICANE_CHUTE_ROWS_MIN: 3,
  FAST_CHICANE_CHUTE_ROWS_MAX: 5,
  SALT_OPENING_BIAS_LEFT: 0x4f504e4c,
  SALT_OPENING_BIAS_RIGHT: 0x4f504e52,
  SALT_FAST_CHICANE_ROWS: 0x46434843,
  SALT_CYCLE_PERSONALITY_FLOW: 0x4350464c,
  SALT_CYCLE_PERSONALITY_TENSION: 0x43505445,

  /** `flowHeavy`: +FLOW row budget (inclusive percent range). */
  FLOW_HEAVY_FLOW_BOOST_MIN_PCT: 15,
  FLOW_HEAVY_FLOW_BOOST_MAX_PCT: 25,
  /** `flowHeavy`: −TENSION row budget (percent). */
  FLOW_HEAVY_TENSION_CUT_PCT: 10,

  /** `tensionEarly`: −FLOW row budget (percent). */
  TENSION_EARLY_FLOW_CUT_PCT: 20,
  /** `tensionEarly`: extra rows trimmed from FLOW so TENSION arrives sooner. */
  TENSION_EARLY_ROWS_SOONER_MIN: 8,
  TENSION_EARLY_ROWS_SOONER_MAX: 12,

  /** When `climaxPreference` is `falseWall` (sole opener), multiply base segment rows. */
  CLIMAX_FALSE_WALL_SOLO_MULTIPLIER: 4,
  /** Rows reserved for multipath tail after solo false-wall segment. */
  CLIMAX_FALSE_WALL_SOLO_TAIL_ROWS: 4,

  /** Signature pinballHop rhythm boss (8-col tuned — see T-009). */
  SIGNATURE_PINBALL_DRIFT_ROWS: 2,
  SIGNATURE_PINBALL_HOP_CYCLES: 4,
  /** Per-cycle drift deltas before bridge + hop (length = SIGNATURE_PINBALL_DRIFT_ROWS). */
  SIGNATURE_PINBALL_DRIFT_PATTERN: [0, 1] as readonly number[],
  /** Sliding pinball chute rows between drift and SNAP (not full-width false-wall bridges). */
  SIGNATURE_PINBALL_BRIDGE_ROWS: 2,
  /** Open columns in each chute row — side pillars stay solid (reads pinball, not cavern). */
  SIGNATURE_BRIDGE_CHUTE_WIDTH: 5,
  /** Floor runway dup after chute / SNAP gap shifts when global dup has ramped down. */
  SIGNATURE_TRANSFER_RUNWAY_DUP_MIN: 6,
  /** Raw hop intent; signature SNAP uses opposite-band target, not hopMag. */
  SIGNATURE_PINBALL_HOP_MAG: 4,

  /** Phase 5 — milestone best-score gates (adjustable tuning). */
  MILESTONE_EARLY_FORK_BEST_SCORE: 300,
  MILESTONE_BREATHER_BEST_SCORE: 700,
  MILESTONE_TENSION_EARLY_BEST_SCORE: 1000,

  /** Session death ring buffer size for attempt memory. */
  DEATH_HISTORY_CAP: 3,
  /** All last N deaths below this score → boost breather opening weight on retry. */
  ATTEMPT_MEMORY_LOW_SCORE_THRESHOLD: 200,
  ATTEMPT_MEMORY_BREATHER_WEIGHT_MULTIPLIER: 3,
  /** breather: straight chute for full opening budget before chicane. */
  BREATHER_CHUTE_ROWS_OVERRIDE: 14,
} as const;

/** Default milestone pool — openings minus milestone-gated `earlyFork` / `breather`. */
export const DEFAULT_OPENING_ARCHETYPES = [
  'warmChute',
  'fastChicane',
  'leftBias',
  'rightBias',
] as const;

/** v1 roll pool — only `flowHeavy` until Phase 5 unlocks others. */
export const DEFAULT_CYCLE_PERSONALITIES = ['flowHeavy'] as const;

export const DEFAULT_SIGNATURE_PATTERNS = ['pinballHop'] as const;

export const DEFAULT_CLIMAX_PREFERENCES = ['pinball', 'falseWall', 'mixed'] as const;

/** Relative weights for weighted opening archetype rolls (same order as DEFAULT_OPENING_ARCHETYPES). */
export const OPENING_ARCHETYPE_WEIGHTS: readonly number[] = [3, 2, 2, 2];

/** Relative weights for cycle personality rolls (same order as DEFAULT_CYCLE_PERSONALITIES). */
export const CYCLE_PERSONALITY_WEIGHTS: readonly number[] = [1];

/** Relative weights for climax preference rolls (same order as DEFAULT_CLIMAX_PREFERENCES). */
export const CLIMAX_PREFERENCE_WEIGHTS: readonly number[] = [2, 2, 3];

/** Relative weights for signature pattern inclusion in blueprint pool roll. */
export const SIGNATURE_PATTERN_WEIGHTS: readonly number[] = [1];
