import {
  ShapeTypes,
  type RenderLayerData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { SWIMMER_CHARACTER_IMAGE } from '@/assets/swimmerCharacters';
import { GIGGLE_CRYSTAL_PROFILE_ID } from './characterProfiles';

export const GOGGLED_SKIN_ID = 'goggled' as const;

export const DEFAULT_SWIMMER_SKIN_ID = GOGGLED_SKIN_ID;

export type SwimmerSkinId = typeof GOGGLED_SKIN_ID;

export type SwimmerSkinDefinition = {
  readonly id: SwimmerSkinId;
  /** Locomotion / physics profile for this skin. */
  readonly profileId: string;
  readonly bodyImageKey: string;
  readonly accessoryImageKey: string;
  /** Accessory draw width as a fraction of the body mesh width. */
  readonly accessoryWidthRatio: number;
  /** Source accessory image width / height (for layout). */
  readonly accessoryImageAspect: number;
  /**
   * Resting accessory offset from body center along Y (negative = toward the head).
   * Expressed as a fraction of body mesh height.
   */
  readonly accessoryRestOffsetYRatio: number;
};

export const GOGGLED_SKIN: SwimmerSkinDefinition = {
  id: GOGGLED_SKIN_ID,
  profileId: GIGGLE_CRYSTAL_PROFILE_ID,
  bodyImageKey: SWIMMER_CHARACTER_IMAGE.floaterGoggledBody,
  accessoryImageKey: SWIMMER_CHARACTER_IMAGE.floaterGoggledGoggles,
  accessoryWidthRatio: 0.88,
  accessoryImageAspect: 621 / 271,
  accessoryRestOffsetYRatio: -0.34,
};

export const getSwimmerSkin = (skinId?: string): SwimmerSkinDefinition => {
  'worklet';
  if (skinId === GOGGLED_SKIN_ID) {
    return GOGGLED_SKIN;
  }
  return GOGGLED_SKIN;
};

export const getAccessoryMeshSize = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number
): { width: number; height: number } => {
  'worklet';
  const width = meshWidth * skin.accessoryWidthRatio;
  const height = width / skin.accessoryImageAspect;
  if (height <= meshHeight) {
    return { width, height };
  }
  const clampedHeight = meshHeight * 0.35;
  return {
    width: clampedHeight * skin.accessoryImageAspect,
    height: clampedHeight,
  };
};

export const getAccessoryRestOffsetY = (
  skin: SwimmerSkinDefinition,
  meshHeight: number,
  meshScaleY = 1
): number => {
  'worklet';
  return meshHeight * skin.accessoryRestOffsetYRatio * meshScaleY;
};

export const buildSwimmerSkinRenderLayers = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number
): RenderLayerData[] => {
  'worklet';
  const accessorySize = getAccessoryMeshSize(skin, meshWidth, meshHeight);

  return [
    {
      shape: {
        type: ShapeTypes.Rectangle,
        width: meshWidth,
        height: meshHeight,
      },
      image: skin.bodyImageKey,
    },
    {
      shape: {
        type: ShapeTypes.Rectangle,
        width: accessorySize.width,
        height: accessorySize.height,
      },
      image: skin.accessoryImageKey,
      position: {
        x: 0,
        y: getAccessoryRestOffsetY(skin, meshHeight),
      },
      opacity: 1,
    },
  ];
};
