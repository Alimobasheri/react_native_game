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

const getLaggingSpringStiffness = (weight: number): number => {
  'worklet';
  const weightScale = Math.max(0.1, weight);
  return secondaryItemTuning.LAGGING_SPRING_STIFFNESS * weightScale;
};

const getLaggingSpringDamping = (weight: number): number => {
  'worklet';
  const weightScale = Math.max(0.1, weight);
  return secondaryItemTuning.LAGGING_SPRING_DAMPING * weightScale;
};

export const createLaggingSpringAccessoryState = (): LaggingSpringAccessoryState => {
  'worklet';
  return {
    kind: 'LaggingSpring',
    localOffsetX: 0,
    localOffsetY: 0,
    springVelocityX: 0,
    springVelocityY: 0,
  };
};

export const updateLaggingSpringAccessory = (
  state: LaggingSpringAccessoryState,
  weight: number,
  velocityX: number,
  dt: number,
  sink: SecondaryItemLayerSink | null
): LaggingSpringAccessoryState => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const velocityFactor = secondaryItemTuning.LAGGING_SPRING_VELOCITY_FACTOR;
  const offsetClamp = secondaryItemTuning.LAGGING_SPRING_OFFSET_CLAMP;
  const stiffness = getLaggingSpringStiffness(weight);
  const damping = getLaggingSpringDamping(weight);

  const targetOffsetX = -velocityX * velocityFactor;
  const forceX = (targetOffsetX - state.localOffsetX) * stiffness;
  const accelerationX = forceX - state.springVelocityX * damping;

  const nextSpringVelocityX = state.springVelocityX + accelerationX * safeDt;
  let nextLocalOffsetX = state.localOffsetX + nextSpringVelocityX * safeDt;
  nextLocalOffsetX = clamp(nextLocalOffsetX, -offsetClamp, offsetClamp);

  const nextState: LaggingSpringAccessoryState = {
    kind: 'LaggingSpring',
    localOffsetX: nextLocalOffsetX,
    localOffsetY: state.localOffsetY,
    springVelocityX: nextSpringVelocityX,
    springVelocityY: state.springVelocityY,
  };

  const layerSink = sink;
  if (layerSink) {
    layerSink.setLocalTransform(nextLocalOffsetX, state.localOffsetY, 0);
  }

  return nextState;
};

export const notifyLaggingSpringPivotImpact = (
  state: LaggingSpringAccessoryState,
  impactForce: number
): LaggingSpringAccessoryState => {
  'worklet';
  const whiplash = secondaryItemTuning.LAGGING_SPRING_PIVOT_WHIPLASH;
  return {
    ...state,
    springVelocityX: -impactForce * whiplash,
  };
};
