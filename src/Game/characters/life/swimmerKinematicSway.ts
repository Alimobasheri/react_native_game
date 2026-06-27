import { MovementState } from '@/Game/characters/characterMovementStates';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import type { SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import { timerProgress } from './swimmerKinematicBreath';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

const clamp = (value: number, min: number, max: number): number => {
  'worklet';
  return Math.min(max, Math.max(min, value));
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

const tierStrengthScale = (tier: number): number => {
  'worklet';
  return 1 + clamp01(tier - 1) * 0.12;
};

export type KinematicSwayResult = {
  amplitudeScale: number;
  speedScale: number;
  directionBias: number;
  glowScale: number;
};

export function syncSwayStageTransition(locomotion: SwimmerLocomotionData): void {
  'worklet';
  const phase = locomotion.visualPhase ?? VisualStrokePhase.IDLE;
  if (locomotion.swayTrackedVisualPhase === phase) {
    return;
  }

  locomotion.swayStageStartAmplitude =
    locomotion.swayAmplitudeLevel ?? swimmerLifeTuning.KINEMATIC_KELP_IDLE_AMPLITUDE;
  locomotion.swayTrackedVisualPhase = phase;
}

const computeAnticipationSwayAmplitude = (
  locomotion: SwimmerLocomotionData,
  startAmplitude: number
): number => {
  'worklet';
  const progress = timerProgress(
    locomotion.visualAnticipationTimer,
    swimmerVisualTuning.ANTICIPATION_DURATION_SEC
  );
  const charged = Math.pow(progress, swimmerLifeTuning.KINEMATIC_ANTICIPATION_CHARGE_EASE);
  return lerp(
    startAmplitude,
    swimmerLifeTuning.KINEMATIC_KELP_ANTICIPATION_AMPLITUDE,
    smoothstep(charged)
  );
};

const computeGlideSwayAmplitude = (
  locomotion: SwimmerLocomotionData,
  startAmplitude: number
): number => {
  'worklet';
  const progress = timerProgress(
    locomotion.visualGlideSettleTimer,
    swimmerVisualTuning.GLIDE_VISUAL_SETTLE_SEC
  );
  const floor = swimmerLifeTuning.KINEMATIC_KELP_GLIDE_AMPLITUDE;
  const drain = 1 - Math.pow(1 - progress, swimmerLifeTuning.KINEMATIC_KELP_GLIDE_DECAY_POWER);
  return lerp(startAmplitude, floor, drain);
};

const computeRecoverySwayAmplitude = (
  locomotion: SwimmerLocomotionData,
  startAmplitude: number
): number => {
  'worklet';
  const progress = timerProgress(
    locomotion.visualRecoveryTimer,
    swimmerVisualTuning.RECOVERY_DURATION_SEC
  );
  const restFrac = swimmerLifeTuning.KINEMATIC_RECOVERY_REST_FRAC;
  if (progress >= 1 - restFrac) {
    return swimmerLifeTuning.KINEMATIC_KELP_IDLE_AMPLITUDE;
  }

  const activeProgress = progress / (1 - restFrac);
  const drain = smoothstep(Math.pow(activeProgress, 0.8));
  return lerp(
    startAmplitude,
    swimmerLifeTuning.KINEMATIC_KELP_RECOVERY_AMPLITUDE,
    drain
  );
};

const computePivotWhipAmplitude = (
  locomotion: SwimmerLocomotionData,
  startAmplitude: number
): number => {
  'worklet';
  const t = swimmerLifeTuning;
  const progress = timerProgress(
    locomotion.visualPivotTimer,
    swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC
  );
  const whipFrac = t.KINEMATIC_KELP_PIVOT_WHIP_FRAC;
  const peak = Math.max(startAmplitude, t.KINEMATIC_KELP_PIVOT_PEAK_AMPLITUDE);

  if (progress < whipFrac) {
    const local = progress / whipFrac;
    const whip = Math.pow(local, t.KINEMATIC_KELP_PIVOT_WHIP_POWER);
    return lerp(startAmplitude, peak, whip);
  }

  const settleT = (progress - whipFrac) / (1 - whipFrac);
  return lerp(peak, t.KINEMATIC_KELP_GLIDE_AMPLITUDE, smoothstep(settleT));
};

const resolveTargetDirectionBias = (
  locomotion: SwimmerLocomotionData,
  visualPhase: VisualStrokePhase
): number => {
  'worklet';
  const t = swimmerLifeTuning;
  const strokeDir = locomotion.visualStrokeDirection ?? locomotion.facingDirection ?? 1;
  const facing = locomotion.facingDirection ?? 1;

  switch (visualPhase) {
    case VisualStrokePhase.ANTICIPATION:
      return -strokeDir * t.KINEMATIC_KELP_ANTICIPATION_BIAS;
    case VisualStrokePhase.STROKE:
      return strokeDir * t.KINEMATIC_KELP_STROKE_BIAS;
    case VisualStrokePhase.PIVOT: {
      const progress = timerProgress(
        locomotion.visualPivotTimer,
        swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC
      );
      if (progress < t.KINEMATIC_KELP_PIVOT_WHIP_FRAC) {
        return -facing * t.KINEMATIC_KELP_PIVOT_INERTIA_BIAS;
      }
      return facing * t.KINEMATIC_KELP_PIVOT_CATCH_BIAS;
    }
    case VisualStrokePhase.GLIDE:
    case VisualStrokePhase.RECOVERY:
      return facing * t.KINEMATIC_KELP_GLIDE_BIAS;
    case VisualStrokePhase.IDLE:
    default:
      return 0;
  }
};

export function updateSwayDirectionLag(
  locomotion: SwimmerLocomotionData,
  velocityX: number,
  dt: number
): void {
  'worklet';
  const t = swimmerLifeTuning;
  const safeDt = dt > 0 ? dt : 0;
  if (!locomotion.swayBiasState) {
    locomotion.swayBiasState = { laggedBias: 0, springVelocity: 0 };
  }

  const visualPhase = locomotion.visualPhase ?? VisualStrokePhase.IDLE;
  const phaseBias = resolveTargetDirectionBias(locomotion, visualPhase);
  const velocityBias = clamp(
    velocityX * t.KINEMATIC_KELP_VELOCITY_BIAS_GAIN,
    -t.KINEMATIC_KELP_BIAS_CLAMP,
    t.KINEMATIC_KELP_BIAS_CLAMP
  );
  const targetBias = clamp(
    phaseBias + velocityBias,
    -t.KINEMATIC_KELP_BIAS_CLAMP,
    t.KINEMATIC_KELP_BIAS_CLAMP
  );

  const state = locomotion.swayBiasState;
  const force =
    (targetBias - state.laggedBias) * t.KINEMATIC_KELP_BIAS_SPRING_STIFFNESS -
    state.springVelocity * t.KINEMATIC_KELP_BIAS_SPRING_DAMPING;
  state.springVelocity += force * safeDt;
  state.laggedBias += state.springVelocity * safeDt;
  state.laggedBias = clamp(
    state.laggedBias,
    -t.KINEMATIC_KELP_BIAS_CLAMP,
    t.KINEMATIC_KELP_BIAS_CLAMP
  );
}

export function computeKinematicSway(
  locomotion: SwimmerLocomotionData
): KinematicSwayResult {
  'worklet';
  const t = swimmerLifeTuning;
  const visualPhase = locomotion.visualPhase ?? VisualStrokePhase.IDLE;
  const startAmplitude =
    locomotion.swayStageStartAmplitude ??
    locomotion.swayAmplitudeLevel ??
    t.KINEMATIC_KELP_IDLE_AMPLITUDE;
  const tier = locomotion.visualStrokeTier ?? locomotion.currentTier ?? 1;
  const directionBias = locomotion.swayBiasState?.laggedBias ?? 0;

  if (visualPhase === VisualStrokePhase.IDLE) {
    return {
      amplitudeScale: t.KINEMATIC_KELP_IDLE_AMPLITUDE,
      speedScale: locomotion.breathSpeedScale ?? 1,
      directionBias,
      glowScale: 1,
    };
  }

  if (locomotion.movementState === MovementState.DRAG) {
    const dragAmplitude = Math.max(
      locomotion.swayAmplitudeLevel ?? t.KINEMATIC_KELP_STROKE_AMPLITUDE,
      t.KINEMATIC_KELP_STROKE_AMPLITUDE * 0.95
    );
    return {
      amplitudeScale: dragAmplitude * tierStrengthScale(tier),
      speedScale: t.KINEMATIC_KELP_ACTION_SPEED_SCALE,
      directionBias,
      glowScale: 1.05,
    };
  }

  let amplitudeScale = locomotion.swayAmplitudeLevel ?? startAmplitude;
  let speedScale = t.KINEMATIC_KELP_ACTION_SPEED_SCALE;
  let glowScale = 1;

  switch (visualPhase) {
    case VisualStrokePhase.ANTICIPATION:
      amplitudeScale = computeAnticipationSwayAmplitude(locomotion, startAmplitude);
      speedScale = t.KINEMATIC_KELP_ANTICIPATION_SPEED_SCALE;
      glowScale = 0.92;
      break;
    case VisualStrokePhase.STROKE:
      amplitudeScale = t.KINEMATIC_KELP_STROKE_AMPLITUDE * tierStrengthScale(tier);
      speedScale = t.KINEMATIC_KELP_STROKE_SPEED_SCALE;
      glowScale = 1.08;
      break;
    case VisualStrokePhase.GLIDE:
      amplitudeScale = computeGlideSwayAmplitude(locomotion, startAmplitude);
      speedScale = t.KINEMATIC_KELP_GLIDE_SPEED_SCALE;
      glowScale = 0.96;
      break;
    case VisualStrokePhase.RECOVERY:
      amplitudeScale = computeRecoverySwayAmplitude(locomotion, startAmplitude);
      speedScale = t.KINEMATIC_KELP_RECOVERY_SPEED_SCALE;
      glowScale = 0.9;
      break;
    case VisualStrokePhase.PIVOT:
      amplitudeScale = computePivotWhipAmplitude(locomotion, startAmplitude);
      speedScale = t.KINEMATIC_KELP_PIVOT_SPEED_SCALE;
      glowScale = 1.04;
      break;
    default:
      break;
  }

  return {
    amplitudeScale: clamp(amplitudeScale, t.KINEMATIC_KELP_MIN_AMPLITUDE, t.KINEMATIC_KELP_MAX_AMPLITUDE),
    speedScale,
    directionBias,
    glowScale,
  };
}
