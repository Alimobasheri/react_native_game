/**
 * Skill praise tuning — Layer A skill-moment flashes (Wave 1).
 * Worklet-safe: plain constants only. Copy and thresholds are data-driven.
 */

export type SkillTierGate = {
  copy: string;
  speedMin?: number;
  diffMin?: number;
  requirePinhole?: boolean;
  requirePinholeContext?: boolean;
  bonusMin: number;
  bonusMax: number;
};

export type SteerPatternTuning = {
  momentId: string;
  enabled: boolean;
  priority: number;
  minCenterDeltaCols?: number;
  minChainLength?: number;
  minNetCenterDelta?: number;
  maxLookbackRows?: number;
  maxGapWidth?: number;
  branchKeyContains?: string;
  tiers: SkillTierGate[];
};

export const skillFeedbackTuning = {
  ENABLED: true,
  HISTORY_BUFFER_SIZE: 8,
  SKIP_STEER_ON_IDENTICAL_GAPS: true,

  families: {
    snap_transfer: {
      enabled: true,
      priority: 100,
      cooldownMs: 1200,
      maxPerRun: 12,
      pinholeMaxWidth: 1,
      flareMinWidth: 3,
      snapMinCenterDeltaCols: 2,
      lookbackUniqueRows: 3,
      tiers: [
        { copy: 'SWEEP!', speedMin: 0, diffMin: 0, bonusMin: 15, bonusMax: 30 },
        { copy: 'CRAZY!', speedMin: 0.55, diffMin: 0.4, bonusMin: 25, bonusMax: 50 },
        {
          copy: 'INSANE!',
          speedMin: 0.7,
          diffMin: 0.55,
          requirePinhole: true,
          bonusMin: 40,
          bonusMax: 70,
        },
      ] as SkillTierGate[],
    },
    ceiling_dodge: {
      enabled: true,
      priority: 80,
      cooldownMs: 600,
      maxPerRun: 24,
      tiers: [
        { copy: 'CLOSE!', bonusMin: 10, bonusMax: 20 },
        { copy: 'TOO CLOSE!', speedMin: 0.5, diffMin: 0.35, bonusMin: 15, bonusMax: 28 },
        {
          copy: 'BY A HAIR!',
          requirePinholeContext: true,
          bonusMin: 18,
          bonusMax: 32,
        },
        {
          copy: 'CHEATED DEATH!',
          speedMin: 0.65,
          diffMin: 0.5,
          bonusMin: 25,
          bonusMax: 45,
        },
      ] as SkillTierGate[],
    },
    steer_clean: {
      enabled: true,
      priority: 60,
      cooldownMs: 500,
      maxPerRun: 30,
      patterns: {
        shift_commit: {
          momentId: 'shift_commit',
          enabled: true,
          priority: 50,
          minCenterDeltaCols: 1,
          tiers: [
            { copy: 'NICE!', bonusMin: 8, bonusMax: 18 },
            { copy: 'SMOOTH!', speedMin: 0.45, diffMin: 0.3, bonusMin: 12, bonusMax: 22 },
          ],
        },
        zigzag_chain: {
          momentId: 'zigzag_chain',
          enabled: true,
          priority: 70,
          minChainLength: 3,
          tiers: [
            { copy: 'ZIG-ZAG!', bonusMin: 12, bonusMax: 22 },
            {
              copy: 'ZIG-ZAG KING!',
              speedMin: 0.5,
              diffMin: 0.35,
              bonusMin: 18,
              bonusMax: 32,
            },
          ],
        },
        slalom_block: {
          momentId: 'slalom_block',
          enabled: true,
          priority: 65,
          minChainLength: 3,
          branchKeyContains: 'chicane',
          tiers: [
            { copy: 'SLALOM!', bonusMin: 12, bonusMax: 24 },
            {
              copy: 'MAJESTIC!',
              speedMin: 0.55,
              diffMin: 0.4,
              bonusMin: 20,
              bonusMax: 35,
            },
          ],
        },
        cross_sweep: {
          momentId: 'cross_sweep',
          enabled: true,
          priority: 55,
          minNetCenterDelta: 4,
          maxLookbackRows: 6,
          tiers: [
            { copy: 'SWEEP!', bonusMin: 14, bonusMax: 26 },
            {
              copy: 'MAJESTIC!',
              speedMin: 0.6,
              diffMin: 0.45,
              bonusMin: 22,
              bonusMax: 38,
            },
          ],
        },
        funnel_thread: {
          momentId: 'funnel_thread',
          enabled: true,
          priority: 45,
          maxGapWidth: 2,
          branchKeyContains: 'funnel',
          tiers: [{ copy: 'TIGHT!', bonusMin: 10, bonusMax: 20 }],
        },
        fork_clean: {
          momentId: 'fork_clean',
          enabled: true,
          priority: 48,
          branchKeyContains: 'paradoxSplit',
          tiers: [{ copy: 'FORKED!', bonusMin: 12, bonusMax: 22 }],
        },
      } as Record<string, SteerPatternTuning>,
    },
    pin_coach: {
      enabled: true,
      priority: 40,
      tapRepeatMs: 350,
      savedCooldownMs: 800,
      maxPerRun: 40,
      tiers: {
        tap: 'TAP',
        saved: 'SAVED!',
        savedBonusMin: 10,
        savedBonusMax: 20,
      },
    },
  },

  bonus: {
    clearanceWeight: 0.35,
    speedWeight: 0.25,
    difficultyWeight: 0.2,
    /** Reference raising speed for speed multiplier normalization. */
    speedReference: 280,
  },

  cleanCross: {
    allowForgivingSideScrape: true,
    adjacentColumnForgiveness: 1,
  },

  /** Normalize raisingSpeed to 0..1 for tier gates. */
  speedNormMax: 400,
} as const;

export type SkillFeedbackTuning = typeof skillFeedbackTuning;
