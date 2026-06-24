import { MovementState } from './characterMovementStates';
import type {
  DeformationScale,
  DeformationScaleSink,
  ProceduralDeformationResult,
} from './proceduralDeformationTypes';
import { swimmerDeformationTuning } from '@/config/swimmerDeformationTuning';
import type { SpeedTier } from '@/Game/ecs-components/Swimmer';

export type { DeformationScale, DeformationScaleSink, ProceduralDeformationResult };

const resolveTargetScaleX = (
  state: MovementState,
  velocityX: number,
  currentTier: SpeedTier,
  idleOscillationPhase: number
): number => {
  'worklet';
  const tuning = swimmerDeformationTuning;

  if (state === MovementState.ANTICIPATION) {
    return tuning.ANTICIPATION_SCALE_X;
  }

  if (state === MovementState.STRIKE) {
    const absVelocityX = Math.abs(velocityX);
    const speedFactor = Math.min(
      absVelocityX / tuning.STRIKE_SPEED_REFERENCE,
      tuning.STRIKE_SPEED_FACTOR_CAP
    );
    return 1.0 + speedFactor * currentTier;
  }

  if (state === MovementState.PIVOT_BRAKE) {
    return tuning.PIVOT_BRAKE_SCALE_X;
  }

  if (state === MovementState.IDLE) {
    const buoyancy =
      Math.sin(idleOscillationPhase) * tuning.IDLE_BUOYANCY_AMPLITUDE;
    return 1.0 + buoyancy;
  }

  return 1.0;
};

const interpolateScale = (
  current: number,
  target: number,
  dt: number
): number => {
  'worklet';
  const retainBase = swimmerDeformationTuning.INTERP_RETAIN_BASE;
  const blend = 1.0 - Math.pow(retainBase, dt);
  return current + (target - current) * blend;
};

export const createDeformationScale = (
  scaleX = 1,
  scaleY = 1
): DeformationScale => {
  'worklet';
  return { scaleX, scaleY };
};

export const updateProceduralDeformation = (
  scale: DeformationScale,
  movementState: MovementState,
  velocityX: number,
  currentTier: SpeedTier,
  dt: number,
  idleOscillationPhase = 0,
  displaySink: DeformationScaleSink | null = null
): ProceduralDeformationResult => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const targetScaleX = resolveTargetScaleX(
    movementState,
    velocityX,
    currentTier,
    idleOscillationPhase
  );
  const targetScaleY = 1.0 / targetScaleX;

  const nextScaleX = interpolateScale(scale.scaleX, targetScaleX, safeDt);
  const nextScaleY = interpolateScale(scale.scaleY, targetScaleY, safeDt);
  scale.scaleX = nextScaleX;
  scale.scaleY = nextScaleY;

  const sink = displaySink;
  if (sink) {
    sink.setScale(nextScaleX, nextScaleY);
  }

  return {
    scaleX: nextScaleX,
    scaleY: nextScaleY,
  };
};
