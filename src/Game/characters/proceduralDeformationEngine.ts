import { MovementState } from './characterMovementStates';
import type {
  DeformationScale,
  DeformationScaleSink,
  ProceduralDeformationResult,
} from './proceduralDeformationTypes';
import { swimmerDeformationTuning } from '@/config/swimmerDeformationTuning';

export type { DeformationScale, DeformationScaleSink, ProceduralDeformationResult };

export type DeformationState = MovementState | 'PINNED' | 'WALL_BUMP';

const resolveTargetScales = (
  state: DeformationState,
  idleOscillationPhase: number,
  breathEnvelope?: number
): { scaleX: number; scaleY: number } => {
  'worklet';
  const tuning = swimmerDeformationTuning;

  if (state === 'PINNED') {
    return { scaleX: tuning.PINNED_SCALE_X, scaleY: tuning.PINNED_SCALE_Y };
  }

  if (state === MovementState.ANTICIPATION) {
    return {
      scaleX: tuning.ANTICIPATION_SCALE_X,
      scaleY: tuning.ANTICIPATION_SCALE_Y,
    };
  }

  if (state === MovementState.STRIKE) {
    return { scaleX: tuning.STRIKE_SCALE_X, scaleY: tuning.STRIKE_SCALE_Y };
  }

  if (state === MovementState.PIVOT_BRAKE) {
    return {
      scaleX: tuning.PIVOT_BRAKE_SCALE_X,
      scaleY: tuning.PIVOT_BRAKE_SCALE_Y,
    };
  }

  if (state === 'WALL_BUMP') {
    return {
      scaleX: tuning.WALL_BUMP_SCALE_X,
      scaleY: tuning.WALL_BUMP_SCALE_Y,
    };
  }

  if (state === MovementState.IDLE) {
    if (breathEnvelope != null) {
      return {
        scaleX: 1.0 + breathEnvelope * tuning.IDLE_BREATH_SCALE_X,
        scaleY: tuning.IDLE_SCALE_Y - breathEnvelope * tuning.IDLE_BREATH_SCALE_Y,
      };
    }
    const buoyancy =
      Math.sin(idleOscillationPhase) * tuning.IDLE_BUOYANCY_AMPLITUDE;
    return {
      scaleX: 1.0 + buoyancy,
      scaleY: tuning.IDLE_SCALE_Y - buoyancy * 0.5,
    };
  }

  return { scaleX: 1.0, scaleY: 1.0 };
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
  deformationState: DeformationState,
  dt: number,
  idleOscillationPhase = 0,
  displaySink: DeformationScaleSink | null = null,
  breathEnvelope?: number
): ProceduralDeformationResult => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const targets = resolveTargetScales(
    deformationState,
    idleOscillationPhase,
    breathEnvelope
  );

  const nextScaleX = interpolateScale(scale.scaleX, targets.scaleX, safeDt);
  const nextScaleY = interpolateScale(scale.scaleY, targets.scaleY, safeDt);
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
