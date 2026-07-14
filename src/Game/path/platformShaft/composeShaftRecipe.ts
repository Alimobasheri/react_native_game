import { composePathChicaneShaft } from '@/Game/path/platformShaft/composePathChicaneShaft';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { pressPinballPair } from '@/Game/path/platformShaft/recipes/pressPinballPair';
import { pivotCross } from '@/Game/path/platformShaft/recipes/pivotCross';
import { pivotGate } from '@/Game/path/platformShaft/recipes/pivotGate';
import type {
  ComposePressIntroShaftParams,
  ComposePressIntroShaftResult,
} from '@/Game/path/platformShaft/types';

export type ShaftRecipeId =
  | 'composePressIntroShaft'
  | 'pressPinballPair'
  | 'pathChicaneShaft'
  | 'pivotGate'
  | 'pivotCross';

export const composeShaftRecipe = (
  recipe: ShaftRecipeId,
  params: ComposePressIntroShaftParams = {}
): ComposePressIntroShaftResult => {
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
  return composePressIntroShaft(params);
};
