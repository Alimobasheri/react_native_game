import { composePathChicaneShaft } from '@/Game/path/platformShaft/composePathChicaneShaft';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { pressPinballPair } from '@/Game/path/platformShaft/recipes/pressPinballPair';
import { pendulumCross } from '@/Game/path/platformShaft/recipes/pendulumCross';
import { pendulumSweep } from '@/Game/path/platformShaft/recipes/pendulumSweep';
import { pistonCeiling } from '@/Game/path/platformShaft/recipes/pistonCeiling';
import { pistonFloor } from '@/Game/path/platformShaft/recipes/pistonFloor';
import { pivotCross } from '@/Game/path/platformShaft/recipes/pivotCross';
import { pivotGate } from '@/Game/path/platformShaft/recipes/pivotGate';
import type {
  ComposePressIntroShaftParams,
  ShaftRecipeComposeResult,
} from '@/Game/path/platformShaft/types';

export type ShaftRecipeId =
  | 'composePressIntroShaft'
  | 'pressPinballPair'
  | 'pathChicaneShaft'
  | 'pivotGate'
  | 'pivotCross'
  | 'pendulumSweep'
  | 'pendulumCross'
  | 'pistonFloor'
  | 'pistonCeiling';

export const composeShaftRecipe = (
  recipe: ShaftRecipeId,
  params: ComposePressIntroShaftParams = {}
): ShaftRecipeComposeResult => {
  'worklet';
  if (recipe === 'pressPinballPair') {
    return pressPinballPair(params);
  }
  if (recipe === 'pathChicaneShaft') {
    return composePathChicaneShaft(params);
  }
  if (recipe === 'pivotGate') {
    return pivotGate(params);
  }
  if (recipe === 'pivotCross') {
    return pivotCross(params);
  }
  if (recipe === 'pendulumSweep') {
    return pendulumSweep(params);
  }
  if (recipe === 'pendulumCross') {
    return pendulumCross(params);
  }
  if (recipe === 'pistonFloor') {
    return pistonFloor(params);
  }
  if (recipe === 'pistonCeiling') {
    return pistonCeiling(params);
  }
  return composePressIntroShaft(params);
};
