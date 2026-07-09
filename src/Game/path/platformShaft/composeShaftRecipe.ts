import { composePathChicaneShaft } from '@/Game/path/platformShaft/composePathChicaneShaft';
import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import { pressPinballPair } from '@/Game/path/platformShaft/recipes/pressPinballPair';
import type {
  ComposePressIntroShaftParams,
  ComposePressIntroShaftResult,
} from '@/Game/path/platformShaft/types';

export type ShaftRecipeId =
  | 'composePressIntroShaft'
  | 'pressPinballPair'
  | 'pathChicaneShaft';

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
  return composePressIntroShaft(params);
};
