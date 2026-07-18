export type PendulumStrikeProfile = 'plunge_kill' | 'knockback_only' | 'pin_compat';

export type PendulumStrikeProfileConfig = {
  impulseSpeed: number;
  velocityBlendFromHead: number;
  knockbackOverrideFrames: number;
  triggerGameOverOnHit: boolean;
  bypassPinState: boolean;
};

export const pendulumHazardTuning = {
  /** Maximum swing angle in radians. Min=0.3, Max=0.8. */
  MAX_ANGLE_RADS: 0.6,
  /** Speed of the swing cycle. Min=0.5 (slow), Max=1.5 (frantic). */
  SWING_FREQUENCY_HZ: 0.8,
  /** Length of the tether in obstacle rows. Min=3, Max=5. */
  TETHER_ROWS: 4,
  /** Runway rows required before a pendulum spawns. */
  MIN_RUNWAY_ROWS: 6,
  /** Minimum open gap columns outside max swing arc (fairness invariant). */
  MIN_OPEN_GAP_COLS: 2,
  /** Pendulum band row span (anchor + tether rows). */
  PENDULUM_BAND_ROW_SPAN: 4,
  /** Head width in grid columns. */
  HEAD_WIDTH_COLS: 1,
  /** Head height in grid rows. */
  HEAD_HEIGHT_ROWS: 1,
  /** Master switch — stories can disable all strikes. */
  STRIKE_ENABLED: true,
  DEFAULT_STRIKE_PROFILE: 'plunge_kill' as PendulumStrikeProfile,
  PROFILES: {
    plunge_kill: {
      impulseSpeed: 3200,
      velocityBlendFromHead: 0.55,
      knockbackOverrideFrames: 72,
      triggerGameOverOnHit: true,
      bypassPinState: true,
    },
    knockback_only: {
      impulseSpeed: 1200,
      velocityBlendFromHead: 0.25,
      knockbackOverrideFrames: 30,
      triggerGameOverOnHit: false,
      bypassPinState: true,
    },
    pin_compat: {
      impulseSpeed: 0,
      velocityBlendFromHead: 0,
      knockbackOverrideFrames: 0,
      triggerGameOverOnHit: false,
      bypassPinState: false,
    },
  },
} as const;

export const resolvePendulumStrikeConfig = (
  profile: PendulumStrikeProfile | undefined
): PendulumStrikeProfileConfig => {
  'worklet';
  const key = profile ?? pendulumHazardTuning.DEFAULT_STRIKE_PROFILE;
  return pendulumHazardTuning.PROFILES[key];
};
