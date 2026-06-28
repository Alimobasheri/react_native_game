/**
 * Player-facing death line copy — maps DeathContext to plain language.
 * Worklet-safe: plain strings only.
 */

export const deathCopyTuning = {
  /** When false, only CAUSE_PINNED is shown. */
  SHOW_GENERATOR_SUFFIX: true,
  CAUSE_PINNED: 'Pinned under rock',
  SUFFIX_SEPARATOR: ' · ',
  /** Fallback when telemetry is missing. */
  FALLBACK: 'You got squished',
} as const;

/** Generator tag → readable suffix fragment (omit key = no suffix). */
export const DEATH_SUFFIX_BY_GENERATOR: Readonly<Record<string, string>> = {
  chute: 'narrow chute',
  pinball: 'pinball lane',
  signature: 'pinball lane',
  funnel: 'tight funnel',
  chicane: 'tight chicane',
  multipath: 'split lanes',
  falseWall: 'false wall',
  paradox: 'tricky lane',
};
