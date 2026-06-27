import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import type { SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import { computeBreathEnvelope } from './swimmerLifeDrivers';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

const lerp = (a: number, b: number, t: number): number => {
  'worklet';
  return a + (b - a) * t;
};

const smoothstep = (t: number): number => {
  'worklet';
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** 0 at phase start, 1 when phase timer elapses. */
export const timerProgress = (remaining: number | undefined, duration: number): number => {
  'worklet';
  if (duration <= 0) {
    return 1;
  }
  return clamp01(1 - (remaining ?? 0) / duration);
};

const tierStrengthScale = (tier: number): number => {
  'worklet';
  return 1 + (clamp01(tier - 1) * 0.12);
};

export type KinematicBreathResult = {
  breath: number;
  strengthScale: number;
  useIdleCycle: boolean;
  phaseSpeedScale: number;
};

export const syncBreathStageTransition = (locomotion: SwimmerLocomotionData): void => {
  'worklet';
  const phase = locomotion.visualPhase ?? VisualStrokePhase.IDLE;
  if (locomotion.breathTrackedVisualPhase === phase) {
    return;
  }

  locomotion.breathStageStartFill = locomotion.breathFillLevel ?? 0;
  locomotion.breathTrackedVisualPhase = phase;
};

const computePivotGaspBreath = (
  locomotion: SwimmerLocomotionData,
  startFill: number
): number => {
  'worklet';
  const t = swimmerLifeTuning;
  const progress = timerProgress(
    locomotion.visualPivotTimer,
    swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC
  );
  const floor = t.KINEMATIC_PIVOT_GASP_FLOOR;
  const exhaleFrac = t.KINEMATIC_PIVOT_EXHALE_FRAC;

  if (progress < exhaleFrac) {
    const local = progress / exhaleFrac;
    const dump = Math.pow(local, t.KINEMATIC_PIVOT_EXHALE_POWER);
    return lerp(startFill, floor, dump);
  }

  const catchT = (progress - exhaleFrac) / (1 - exhaleFrac);
  const catchBump = t.KINEMATIC_PIVOT_GASP_CATCH * smoothstep(catchT);
  return floor + catchBump;
};

const computeAnticipationBreath = (
  locomotion: SwimmerLocomotionData,
  startFill: number
): number => {
  'worklet';
  const progress = timerProgress(
    locomotion.visualAnticipationTimer,
    swimmerVisualTuning.ANTICIPATION_DURATION_SEC
  );
  const charged = Math.pow(progress, swimmerLifeTuning.KINEMATIC_ANTICIPATION_CHARGE_EASE);
  return lerp(startFill, 1, smoothstep(charged));
};

const computeGlideBreath = (locomotion: SwimmerLocomotionData, startFill: number): number => {
  'worklet';
  const progress = timerProgress(
    locomotion.visualGlideSettleTimer,
    swimmerVisualTuning.GLIDE_VISUAL_SETTLE_SEC
  );
  const floor = swimmerLifeTuning.KINEMATIC_GLIDE_MIN_FILL;
  const drain = 1 - Math.pow(1 - progress, 1.8);
  return lerp(startFill, floor, drain);
};

const computeRecoveryBreath = (
  locomotion: SwimmerLocomotionData,
  startFill: number
): number => {
  'worklet';
  const progress = timerProgress(
    locomotion.visualRecoveryTimer,
    swimmerVisualTuning.RECOVERY_DURATION_SEC
  );
  const restFrac = swimmerLifeTuning.KINEMATIC_RECOVERY_REST_FRAC;
  if (progress >= 1 - restFrac) {
    return 0;
  }

  const activeProgress = progress / (1 - restFrac);
  const drain = smoothstep(Math.pow(activeProgress, 0.8));
  return lerp(startFill, 0, drain);
};

export const computeKinematicBreath = (
  locomotion: SwimmerLocomotionData,
  idlePhase: number
): KinematicBreathResult => {
  'worklet';
  const visualPhase = locomotion.visualPhase ?? VisualStrokePhase.IDLE;
  const startFill = locomotion.breathStageStartFill ?? locomotion.breathFillLevel ?? 0;
  const tier = locomotion.visualStrokeTier ?? locomotion.currentTier ?? 1;

  if (visualPhase === VisualStrokePhase.IDLE) {
    return {
      breath: computeBreathEnvelope(idlePhase),
      strengthScale: 1,
      useIdleCycle: true,
      phaseSpeedScale: locomotion.breathSpeedScale ?? 1,
    };
  }

  if (visualPhase === VisualStrokePhase.STROKE) {
    return {
      breath: Math.max(locomotion.breathFillLevel ?? 1, 0.95),
      strengthScale: tierStrengthScale(tier),
      useIdleCycle: false,
      phaseSpeedScale: swimmerLifeTuning.KINEMATIC_ACTION_PHASE_SPEED,
    };
  }

  let breath = locomotion.breathFillLevel ?? startFill;
  let strengthScale = tierStrengthScale(tier);

  switch (visualPhase) {
    case VisualStrokePhase.ANTICIPATION:
      breath = computeAnticipationBreath(locomotion, startFill);
      strengthScale *= 1.25;
      break;
    case VisualStrokePhase.STROKE:
      breath = 1;
      strengthScale *= 1.15;
      break;
    case VisualStrokePhase.GLIDE:
      breath = computeGlideBreath(locomotion, startFill);
      strengthScale *= 0.95;
      break;
    case VisualStrokePhase.RECOVERY:
      breath = computeRecoveryBreath(locomotion, startFill);
      strengthScale *= 0.9;
      break;
    case VisualStrokePhase.PIVOT:
      breath = computePivotGaspBreath(locomotion, startFill);
      strengthScale *= 1.05;
      break;
    default:
      break;
  }

  return {
    breath: clamp01(breath),
    strengthScale,
    useIdleCycle: false,
    phaseSpeedScale: swimmerLifeTuning.KINEMATIC_ACTION_PHASE_SPEED,
  };
};
