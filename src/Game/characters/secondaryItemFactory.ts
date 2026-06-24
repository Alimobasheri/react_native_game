import type { SecondaryItemType } from './characterProfileTypes';
import { createLaggingSpringAccessoryState } from './accessories/laggingSpringGoggles';
import { createProceduralChainAccessoryState } from './accessories/proceduralChainAntenna';
import { createShaderReactiveAccessoryState } from './accessories/shaderReactiveLavaEye';
import type { SecondaryItemPersistedState } from './secondaryItemTypes';

export const createDefaultAccessoryState = (
  type: SecondaryItemType
): SecondaryItemPersistedState => {
  'worklet';
  if (type === 'LaggingSpring') {
    return createLaggingSpringAccessoryState();
  }
  if (type === 'ProceduralChain') {
    return createProceduralChainAccessoryState();
  }
  return createShaderReactiveAccessoryState();
};
