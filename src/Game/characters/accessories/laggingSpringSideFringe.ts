import { secondaryItemTuning } from '@/config/secondaryItemTuning';
import type {
  LaggingSpringAccessoryState,
  SecondaryItemLayerSink,
} from '../secondaryItemTypes';

const clamp = (value: number, min: number, max: number): number => {
  'worklet';
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

/**
 * Keeps the sprite anchor fixed while skew + light rotation move the right-side tips.
 */
export const getSideFringePinnedPosition = (
  skewX: number,
  angleRad: number,
  layerWidth: number,
  layerHeight: number,
  anchorXRatio = 0.18,
  anchorYRatio = 0.48
): { x: number; y: number } => {
  'worklet';
  const ax = layerWidth * (anchorXRatio - 0.5);
  const ay = layerHeight * (anchorYRatio - 0.5);
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const skewedX = ax + skewX * ay;
  const skewedY = ay;
  const rotatedX = skewedX * cosA - skewedY * sinA;
  const rotatedY = skewedX * sinA + skewedY * cosA;
  return {
    x: ax - rotatedX,
    y: ay - rotatedY,
  };
};

export const updateLaggingSpringSideFringe = (
  state: LaggingSpringAccessoryState,
  weight: number,
  velocityX: number,
  dt: number,
  layerWidth: number,
  layerHeight: number,
  sink: SecondaryItemLayerSink | null,
  anchorXRatio = 0.18,
  anchorYRatio = 0.48
): LaggingSpringAccessoryState => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const weightScale = Math.max(0.1, weight);
  const stiffness =
    secondaryItemTuning.SIDE_FRINGE_SPRING_STIFFNESS * weightScale;
  const damping =
    secondaryItemTuning.SIDE_FRINGE_SPRING_DAMPING * weightScale;

  const targetSkew =
    -velocityX * secondaryItemTuning.SIDE_FRINGE_SKEW_VELOCITY_FACTOR;
  const forceSkew = (targetSkew - state.localOffsetX) * stiffness;
  const accelSkew = forceSkew - state.springVelocityX * damping;
  const nextSpringVelocityX = state.springVelocityX + accelSkew * safeDt;
  let nextSkew = state.localOffsetX + nextSpringVelocityX * safeDt;
  nextSkew = clamp(
    nextSkew,
    -secondaryItemTuning.SIDE_FRINGE_SKEW_CLAMP,
    secondaryItemTuning.SIDE_FRINGE_SKEW_CLAMP
  );

  const bobPhase =
    (state.windPhase ?? 0) +
    safeDt * secondaryItemTuning.SIDE_FRINGE_BOB_PHASE_SPEED;
  const flutterPhase =
    (state.flutterPhase ?? 0) +
    safeDt * secondaryItemTuning.SIDE_FRINGE_SECONDARY_BOB_SPEED;

  const primaryBob =
    Math.sin(bobPhase) * secondaryItemTuning.SIDE_FRINGE_BOB_AMPLITUDE;
  const secondaryBob =
    Math.sin(flutterPhase * 1.37) *
    Math.sin(flutterPhase * 0.91) *
    secondaryItemTuning.SIDE_FRINGE_SECONDARY_BOB_AMPLITUDE;

  const strandSkew = clamp(
    nextSkew + primaryBob + secondaryBob,
    -secondaryItemTuning.SIDE_FRINGE_SKEW_CLAMP,
    secondaryItemTuning.SIDE_FRINGE_SKEW_CLAMP
  );

  const tipAngle = clamp(
    -velocityX * secondaryItemTuning.SIDE_FRINGE_ANGLE_VELOCITY_FACTOR,
    -secondaryItemTuning.SIDE_FRINGE_ANGLE_CLAMP,
    secondaryItemTuning.SIDE_FRINGE_ANGLE_CLAMP
  );

  const nextState: LaggingSpringAccessoryState = {
    kind: 'LaggingSpring',
    localOffsetX: nextSkew,
    localOffsetY: 0,
    springVelocityX: nextSpringVelocityX,
    springVelocityY: 0,
    windPhase: bobPhase,
    flutterPhase,
  };

  if (sink) {
    const pinned = getSideFringePinnedPosition(
      strandSkew,
      tipAngle,
      layerWidth,
      layerHeight,
      anchorXRatio,
      anchorYRatio
    );
    sink.setLocalTransform(pinned.x, pinned.y, tipAngle, strandSkew);
  }

  return nextState;
};

export const notifyLaggingSpringSideFringePivotImpact = (
  state: LaggingSpringAccessoryState,
  impactForce: number
): LaggingSpringAccessoryState => {
  'worklet';
  const whiplash = secondaryItemTuning.SIDE_FRINGE_PIVOT_WHIPLASH;
  return {
    ...state,
    springVelocityX: impactForce * whiplash * 0.0012,
  };
};
