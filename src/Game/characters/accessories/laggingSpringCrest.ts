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

const getCrestStiffness = (weight: number): number => {
  'worklet';
  const weightScale = Math.max(0.1, weight);
  return secondaryItemTuning.CREST_SPRING_STIFFNESS * weightScale;
};

const getCrestDamping = (weight: number): number => {
  'worklet';
  const weightScale = Math.max(0.1, weight);
  return secondaryItemTuning.CREST_SPRING_DAMPING * weightScale;
};

/**
 * Layer-center offset so rotation pivots around the sprite bottom (crest root on head).
 * Spring lag must not translate X — only angle bends the leaves.
 */
export const getCrestRootPinnedPosition = (
  angleRad: number,
  layerHeight: number
): { x: number; y: number } => {
  'worklet';
  const halfH = layerHeight / 2;
  const sinA = Math.sin(angleRad);
  const cosA = Math.cos(angleRad);
  return {
    x: sinA * halfH,
    y: (1 - cosA) * halfH,
  };
};

export const updateLaggingSpringCrest = (
  state: LaggingSpringAccessoryState,
  weight: number,
  velocityX: number,
  dt: number,
  layerHeight: number,
  sink: SecondaryItemLayerSink | null
): LaggingSpringAccessoryState => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const velocityFactor = secondaryItemTuning.CREST_SPRING_VELOCITY_FACTOR;
  const offsetClamp = secondaryItemTuning.CREST_SPRING_OFFSET_CLAMP;
  const stiffness = getCrestStiffness(weight);
  const damping = getCrestDamping(weight);

  const targetOffsetX = -velocityX * velocityFactor;
  const forceX = (targetOffsetX - state.localOffsetX) * stiffness;
  const accelerationX = forceX - state.springVelocityX * damping;

  const nextSpringVelocityX = state.springVelocityX + accelerationX * safeDt;
  let nextLocalOffsetX = state.localOffsetX + nextSpringVelocityX * safeDt;
  nextLocalOffsetX = clamp(nextLocalOffsetX, -offsetClamp, offsetClamp);

  const stalkBend =
    nextLocalOffsetX * secondaryItemTuning.CREST_BEND_ANGLE_FACTOR +
    Math.sign(nextLocalOffsetX) *
      nextLocalOffsetX *
      nextLocalOffsetX *
      secondaryItemTuning.CREST_BEND_ANGLE_CURVE;

  const targetWindLift =
    Math.abs(velocityX) * secondaryItemTuning.CREST_WIND_LIFT_FACTOR;
  const forceY = (targetWindLift - state.localOffsetY) * stiffness * 0.6;
  const accelerationY = forceY - state.springVelocityY * damping;

  const nextSpringVelocityY = state.springVelocityY + accelerationY * safeDt;
  let nextLocalOffsetY = state.localOffsetY + nextSpringVelocityY * safeDt;
  nextLocalOffsetY = clamp(
    nextLocalOffsetY,
    -secondaryItemTuning.CREST_WIND_LIFT_CLAMP,
    secondaryItemTuning.CREST_WIND_LIFT_CLAMP
  );

  const windAngle =
    nextLocalOffsetY * secondaryItemTuning.CREST_WIND_LIFT_ANGLE_FACTOR;

  const windPhase =
    (state.windPhase ?? 0) +
    safeDt * secondaryItemTuning.CREST_WIND_PHASE_SPEED;
  const flutterPhase =
    (state.flutterPhase ?? 0) +
    safeDt * secondaryItemTuning.CREST_FLUTTER_PHASE_SPEED;

  const ambientWind =
    Math.sin(windPhase) * secondaryItemTuning.CREST_WIND_AMBIENT_AMPLITUDE;
  const leafFlutter =
    Math.sin(flutterPhase * 2.17) *
    Math.sin(flutterPhase * 1.31) *
    secondaryItemTuning.CREST_FLUTTER_AMPLITUDE;

  const totalAngle = clamp(
    stalkBend + windAngle + ambientWind + leafFlutter,
    -secondaryItemTuning.CREST_BEND_ANGLE_CLAMP,
    secondaryItemTuning.CREST_BEND_ANGLE_CLAMP
  );

  const nextState: LaggingSpringAccessoryState = {
    kind: 'LaggingSpring',
    localOffsetX: nextLocalOffsetX,
    localOffsetY: nextLocalOffsetY,
    springVelocityX: nextSpringVelocityX,
    springVelocityY: nextSpringVelocityY,
    windPhase,
    flutterPhase,
  };

  const layerSink = sink;
  if (layerSink) {
    const pinned = getCrestRootPinnedPosition(totalAngle, layerHeight);
    layerSink.setLocalTransform(pinned.x, pinned.y, totalAngle);
  }

  return nextState;
};

export const notifyLaggingSpringCrestPivotImpact = (
  state: LaggingSpringAccessoryState,
  impactForce: number
): LaggingSpringAccessoryState => {
  'worklet';
  const whiplash = secondaryItemTuning.CREST_PIVOT_WHIPLASH;
  return {
    ...state,
    springVelocityX: -impactForce * whiplash,
    springVelocityY: impactForce * whiplash * 0.35,
  };
};
