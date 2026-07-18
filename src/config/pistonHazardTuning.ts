/**
 * Vertical Piston Hazard — gameplay tuning.
 *
 * Spec: docs/game-design/moving-hazard-system-architecture.md (piston)
 * Polish deferred: see PLATFORM_SHAFT_PISTON_* in platformShaftTODO.ts
 */

export type PistonMountType = 'floor' | 'ceiling';

export type PistonSafeExitSide = 'left' | 'right';

export const pistonHazardTuning = {
  /** Inner columns only — never 0 or 5. */
  MIN_COLUMN: 1,
  MAX_COLUMN: 4,

  /** Base vertical movement speed in rows per second. Min=0.5, Max=3.0. */
  BASE_SPEED_ROWS_PER_SEC: 1.5,

  /** Track length in rows. Min=1.0, Max=2.5. */
  TRACK_LENGTH_ROWS: 1.5,

  /** Pause at tip before retract, in seconds. */
  HOLD_AT_TIP_SEC: 0.18,

  /** Rows of visibility before motion begins (telegraph). */
  TELEGRAPH_DELAY_ROWS: 1.0,

  /** Bright telegraph pulse duration in seconds (~0.5s per spec). */
  TELEGRAPH_PULSE_SEC: 0.5,

  /** Head visual width as fraction of column width. */
  HEAD_WIDTH_COL_FRACTION: 0.32,

  /** Head visual height as fraction of block height. */
  HEAD_HEIGHT_ROW_FRACTION: 1.15,

  /** Collider inset vs visual (fair edge contacts). */
  COLLIDER_INSET_FRACTION: 0.12,

  /** Track line width in px (base; scaled by column width at render). */
  TRACK_WIDTH_PX: 3,

  /** Base horizontal bounce velocity (px/s). */
  BOUNCE_BASE_IMPULSE_X: 150,

  /** Multiplier on incoming horizontal speed toward the piston. */
  BOUNCE_VELOCITY_MULTIPLIER: 0.6,

  /** Cap horizontal bounce impulse (px/s). */
  MAX_BOUNCE_IMPULSE_X: 800,

  /** Downward Y velocity on bounce (px/s, +Y = down). */
  BOUNCE_IMPULSE_Y_DOWN: 200,

  /** Cap downward bounce impulse (px/s). */
  MAX_BOUNCE_IMPULSE_Y: 500,

  /** Time-based control lock after bounce (seconds). Refresh-rate independent. */
  BOUNCE_RECOVERY_SEC: 0.22,

  /** Depenetration padding outside piston AABB after bounce (px). */
  BOUNCE_SEPARATION_PAD_PX: 2,

  /** Gap difficulty threshold before pistons may insert into production. */
  MIN_DIFFICULTY_01: 0.35,

  /**
   * First unlocked-run piston is guaranteed after this much active gameplay.
   * It is inserted at the next generated row, so the composed runway remains intact.
   */
  FIRST_PRODUCTION_INSERT_DELAY_SEC: 10,

  /** Minimum generated rows between later production piston segments. */
  MIN_ROWS_BETWEEN_PRODUCTION_INSERTS: 40,

  /** Runway rows before band (compose fairness). */
  MIN_RUNWAY_ROWS: 4,

  /** Empty rows beyond max extension in mount column (fairness). */
  MIN_CLEARANCE_ROWS_BEYOND_STROKE: 2,

  /** Release corridor after piston band. */
  POST_PISTON_RELEASE_ROWS: 8,

  /** Approach wall rows framing the band. */
  APPROACH_WALL_ROWS: 2,

  /** Band row span = mount + track floor/ceil framing. */
  PISTON_BAND_ROW_SPAN: 3,

  /** Production insertion: chance weight at MIN_DIFFICULTY (0..1). */
  PRODUCTION_INSERT_WEIGHT_AT_MIN: 0.12,

  /** Production insertion: chance weight at difficulty 1. */
  PRODUCTION_INSERT_WEIGHT_AT_MAX: 0.28,

  /** Fraction of ceiling mounts at MIN_DIFFICULTY. */
  CEILING_MOUNT_WEIGHT_AT_MIN: 0.2,

  /** Fraction of ceiling mounts at difficulty 1. */
  CEILING_MOUNT_WEIGHT_AT_MAX: 0.65,

  /** Visual colors — machinery crimson vs grey track. */
  TRACK_COLOR: '#555555',
  HEAD_COLOR: '#C41E3A',
  HEAD_TELEGRAPH_COLOR: '#FF6B7A',
} as const;
