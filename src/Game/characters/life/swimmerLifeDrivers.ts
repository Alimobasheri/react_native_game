import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import type { InternalLifeState, InternalMotionProfileId } from './swimmerLifeTypes';

const clamp01 = (t: number): number => {
  'worklet';
  return Math.min(1, Math.max(0, t));
};

/** Local 0→1 progress inside a phase segment. */
const segmentT = (phase: number, start: number, end: number): number => {
  'worklet';
  if (end <= start) return 0;
  return clamp01((phase - start) / (end - start));
};

/**
 * Piecewise breath envelope inspired by idle breathing animation:
 * - brief rest at empty lungs
 * - slower inhale with ease-in/out (belly leads, chest follows)
 * - hold at full inhale (flat tangent at peak)
 * - faster exhale with soft landing
 *
 * @see https://www.animationmentor.com/blog/tutorial-animate-natural-breathing-loops/
 * @see https://blog.animschool.edu/2024/11/15/breathing-life-into-your-animation/
 */
export const computeBreathEnvelope = (phase: number): number => {
  'worklet';
  const p = ((phase % 1) + 1) % 1;
  const t = swimmerLifeTuning;

  const rest = t.INTERNAL_BREATH_REST_FRAC;
  const inhale = t.INTERNAL_BREATH_INHALE_FRAC;
  const hold = t.INTERNAL_BREATH_HOLD_FRAC;
  const exhale = t.INTERNAL_BREATH_EXHALE_FRAC;

  const restEnd = rest;
  const inhaleEnd = restEnd + inhale;
  const holdEnd = inhaleEnd + hold;
  const exhaleEnd = holdEnd + exhale;

  if (p < restEnd || p >= exhaleEnd) {
    return 0;
  }

  if (p < inhaleEnd) {
    const local = segmentT(p, restEnd, inhaleEnd);
    const eased = Math.pow(local, t.INTERNAL_BREATH_INHALE_EASE);
    const smoothInhale = eased * eased * (3 - 2 * eased);
    return smoothInhale;
  }

  if (p < holdEnd) {
    return 1;
  }

  const local = segmentT(p, holdEnd, exhaleEnd);
  const eased = Math.pow(local, t.INTERNAL_BREATH_EXHALE_EASE);
  const smoothExhale = eased * eased * (3 - 2 * eased);
  return 1 - smoothExhale;
};

export type BreathMotion = {
  /** 0–1 fill level inside body (inhale up, exhale drain). */
  breath: number;
  glow: number;
};

export const computeBreathMotion = (
  phase: number,
  glowOverride?: number,
  strengthScale = 1,
  breathOverride?: number
): BreathMotion => {
  'worklet';
  const breath = breathOverride ?? computeBreathEnvelope(phase);
  const scaledBreath = Math.min(1, breath * strengthScale);
  const glow =
    glowOverride ??
    swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_BASE +
      swimmerLifeTuning.INTERNAL_RIPPLE_GLOW_PEAK *
        Math.pow(scaledBreath, 1.25);
  return { breath: scaledBreath, glow };
};

export const advanceInternalLifePhase = (
  state: InternalLifeState | undefined,
  profile: InternalMotionProfileId,
  dt: number,
  meshScaleY = 1,
  speedScale = 1
): InternalLifeState => {
  'worklet';
  if (profile === 'none' || dt <= 0) {
    return { phase: state?.phase ?? 0 };
  }

  const cycleSec =
    profile === 'kelpSway'
      ? swimmerLifeTuning.INTERNAL_KELP_SWAY_CYCLE_SEC
      : swimmerLifeTuning.INTERNAL_RIPPLE_CYCLE_SEC;

  const scale = meshScaleY < 1 ? meshScaleY : 1;
  const nextPhase =
    ((state?.phase ?? 0) + (dt / cycleSec) * scale * speedScale) % 1;
  return { phase: nextPhase };
};
