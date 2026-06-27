import type { MovementState } from '../characterMovementStates';
import { secondaryItemTuning } from '@/config/secondaryItemTuning';
import type {
  SecondaryItemLayerSink,
  ShaderReactiveAccessoryState,
} from '../secondaryItemTypes';

export const createShaderReactiveAccessoryState =
  (): ShaderReactiveAccessoryState => {
    'worklet';
    return {
      kind: 'ShaderReactive',
      offsetX: 0,
      opacity: secondaryItemTuning.SHADER_REACTIVE_BASE_OPACITY,
    };
  };

export const updateShaderReactiveAccessory = (
  state: ShaderReactiveAccessoryState,
  velocityX: number,
  scaleX: number,
  _movementState: MovementState,
  dt: number,
  sink: SecondaryItemLayerSink | null
): ShaderReactiveAccessoryState => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const absVelocityX = Math.abs(velocityX);
  const tierProxy = Math.min(3, Math.max(1, Math.floor(absVelocityX / 150)));

  const targetOpacity = Math.min(
    1,
    secondaryItemTuning.SHADER_REACTIVE_BASE_OPACITY +
      tierProxy * secondaryItemTuning.SHADER_REACTIVE_TIER_OPACITY_BOOST +
      absVelocityX * secondaryItemTuning.SHADER_REACTIVE_SPEED_OPACITY_SCALE
  );

  const squeeze =
    (2 - scaleX) * secondaryItemTuning.SHADER_REACTIVE_TIER_OFFSET_SQUEEZE;
  const targetOffsetX = -tierProxy * squeeze;

  const blend = Math.min(1, safeDt * 12);
  const nextOpacity = state.opacity + (targetOpacity - state.opacity) * blend;
  const nextOffsetX = state.offsetX + (targetOffsetX - state.offsetX) * blend;

  const nextState: ShaderReactiveAccessoryState = {
    kind: 'ShaderReactive',
    offsetX: nextOffsetX,
    opacity: nextOpacity,
  };

  const layerSink = sink;
  if (layerSink) {
    layerSink.setLocalTransform(nextOffsetX, 0, 0);
    if (layerSink.setOpacity) {
      layerSink.setOpacity(nextOpacity);
    }
  }

  return nextState;
};

export const notifyShaderReactivePivotImpact = (
  state: ShaderReactiveAccessoryState,
  impactForce: number
): ShaderReactiveAccessoryState => {
  'worklet';
  return {
    ...state,
    opacity: Math.min(1, state.opacity + impactForce * 0.001),
  };
};
