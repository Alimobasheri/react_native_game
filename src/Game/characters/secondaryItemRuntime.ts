import { MovementState } from './characterMovementStates';
import type { SecondaryItemType } from './characterProfileTypes';
import {
  notifyLaggingSpringPivotImpact,
  updateLaggingSpringAccessory,
} from './accessories/laggingSpringGoggles';
import {
  notifyLaggingSpringCrestPivotImpact,
  updateLaggingSpringCrest,
} from './accessories/laggingSpringCrest';
import {
  notifyLaggingSpringSideFringePivotImpact,
  updateLaggingSpringSideFringe,
} from './accessories/laggingSpringSideFringe';
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
  /** When set, crest spring uses bottom-anchored bend instead of face lag. */
  crestLayerHeight?: number;
  crestLayerWidth?: number;
  crestAnchorXRatio?: number;
  crestAnchorYRatio?: number;
  crestAccessoryStyle?: 'upright' | 'sideFringe';
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

export function updateSecondaryAccessory(
  type: SecondaryItemType,
  weight: number,
  state: SecondaryItemPersistedState,
  args: SecondaryAccessoryUpdateArgs,
  sink: SecondaryItemLayerSink | null
): SecondaryItemPersistedState {
  'worklet';
  if (state.kind === 'LaggingSpring' && type === 'LaggingSpring') {
    if (args.crestLayerHeight !== undefined) {
      if (args.crestAccessoryStyle === 'sideFringe') {
        return updateLaggingSpringSideFringe(
          state,
          weight,
          args.velocityX,
          args.dt,
          args.crestLayerWidth ?? args.crestLayerHeight,
          args.crestLayerHeight,
          sink,
          args.crestAnchorXRatio,
          args.crestAnchorYRatio
        );
      }
      return updateLaggingSpringCrest(
        state,
        weight,
        args.velocityX,
        args.dt,
        args.crestLayerWidth ?? args.crestLayerHeight,
        args.crestLayerHeight,
        sink,
        args.crestAnchorXRatio,
        args.crestAnchorYRatio
      );
    }
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
}

export const notifySecondaryAccessoryPivotImpact = (
  type: SecondaryItemType,
  state: SecondaryItemPersistedState,
  impactForce: number,
  crestMode = false,
  crestAccessoryStyle: 'upright' | 'sideFringe' = 'upright'
): SecondaryItemPersistedState => {
  'worklet';
  if (state.kind === 'LaggingSpring' && type === 'LaggingSpring') {
    if (crestMode) {
      if (crestAccessoryStyle === 'sideFringe') {
        return notifyLaggingSpringSideFringePivotImpact(state, impactForce);
      }
      return notifyLaggingSpringCrestPivotImpact(state, impactForce);
    }
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
