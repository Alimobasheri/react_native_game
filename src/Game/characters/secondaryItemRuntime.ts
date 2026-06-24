import { MovementState } from './characterMovementStates';
import type { SecondaryItemType } from './characterProfileTypes';
import {
  notifyLaggingSpringPivotImpact,
  updateLaggingSpringAccessory,
} from './accessories/laggingSpringGoggles';
import {
  notifyProceduralChainPivotImpact,
  updateProceduralChainAccessory,
} from './accessories/proceduralChainAntenna';
import {
  notifyShaderReactivePivotImpact,
  updateShaderReactiveAccessory,
} from './accessories/shaderReactiveLavaEye';
import { createDefaultAccessoryState } from './secondaryItemFactory';
import type {
  SecondaryItemLayerSink,
  SecondaryItemPersistedState,
} from './secondaryItemTypes';

export type SecondaryAccessoryUpdateArgs = {
  velocityX: number;
  parentAngleDeg: number;
  scaleX: number;
  scaleY: number;
  movementState: MovementState;
  dt: number;
};

export const ensureAccessoryState = (
  type: SecondaryItemType,
  state: SecondaryItemPersistedState | undefined
): SecondaryItemPersistedState => {
  'worklet';
  if (state) {
    return state;
  }
  return createDefaultAccessoryState(type);
};

export const updateSecondaryAccessory = (
  type: SecondaryItemType,
  weight: number,
  state: SecondaryItemPersistedState,
  args: SecondaryAccessoryUpdateArgs,
  sink: SecondaryItemLayerSink | null
): SecondaryItemPersistedState => {
  'worklet';
  if (state.kind === 'LaggingSpring' && type === 'LaggingSpring') {
    return updateLaggingSpringAccessory(
      state,
      weight,
      args.velocityX,
      args.dt,
      sink
    );
  }

  if (state.kind === 'ProceduralChain' && type === 'ProceduralChain') {
    return updateProceduralChainAccessory(
      state,
      args.velocityX,
      args.dt,
      sink
    );
  }

  if (state.kind === 'ShaderReactive' && type === 'ShaderReactive') {
    return updateShaderReactiveAccessory(
      state,
      args.velocityX,
      args.scaleX,
      args.movementState,
      args.dt,
      sink
    );
  }

  const freshState = createDefaultAccessoryState(type);
  return updateSecondaryAccessory(type, weight, freshState, args, sink);
};

export const notifySecondaryAccessoryPivotImpact = (
  type: SecondaryItemType,
  state: SecondaryItemPersistedState,
  impactForce: number
): SecondaryItemPersistedState => {
  'worklet';
  if (state.kind === 'LaggingSpring' && type === 'LaggingSpring') {
    return notifyLaggingSpringPivotImpact(state, impactForce);
  }

  if (state.kind === 'ProceduralChain' && type === 'ProceduralChain') {
    return notifyProceduralChainPivotImpact(state, impactForce);
  }

  if (state.kind === 'ShaderReactive' && type === 'ShaderReactive') {
    return notifyShaderReactivePivotImpact(state, impactForce);
  }

  return state;
};
