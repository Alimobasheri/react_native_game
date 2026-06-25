import { BlendMode } from '@shopify/react-native-skia';
import {
  ShapeTypes,
  type RenderLayerData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { SWIMMER_CHARACTER_IMAGE } from '@/assets/swimmerCharacters';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { GIGGLE_CRYSTAL_PROFILE_ID } from './characterProfiles';
import { getInternalRippleBandSize } from './swimmerInternalRipple';

export const AQUA_SPROUT_SKIN_ID = 'aqua-sprout' as const;
export const GOGGLED_SKIN_ID = 'goggled' as const;

export const DEFAULT_SWIMMER_SKIN_ID = AQUA_SPROUT_SKIN_ID;

export type SwimmerSkinId = typeof AQUA_SPROUT_SKIN_ID | typeof GOGGLED_SKIN_ID;

export type SwimmerInternalMotionType = 'none' | 'ripple';

export type SwimmerBlinkType = 'none' | 'tinyDotBlink';

export type SwimmerSkinFeatureLayer = {
  readonly featureImageKey: string;
  /** Feature draw width as a fraction of the body mesh width. */
  readonly featureWidthRatio: number;
  /** Source feature image width / height (for layout). */
  readonly featureImageAspect: number;
  /**
   * Resting feature offset from body center along Y (negative = toward the head).
   * Expressed as a fraction of body mesh height.
   */
  readonly featureRestOffsetYRatio: number;
};

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
  /** Optional tiny feature / eyes layer between body and crest (layer 1). */
  readonly feature?: SwimmerSkinFeatureLayer;
  /** When true, crest uses bottom-anchored bend spring instead of face lag. */
  readonly crestAccessory?: boolean;
  /** Masked procedural motion inside the body rect (layer between body and feature). */
  readonly internalMotion?: SwimmerInternalMotionType;
  /** Tiny feature blink / pulse animation on the feature layer. */
  readonly blinkType?: SwimmerBlinkType;
};

export const SWIMMER_BODY_LAYER_INDEX = 0;

const skinHasInternalLayer = (skin: SwimmerSkinDefinition): boolean => {
  'worklet';
  return skin.internalMotion != null && skin.internalMotion !== 'none';
};

export const getSwimmerInternalLayerIndex = (
  skin: SwimmerSkinDefinition
): number | null => {
  'worklet';
  return skinHasInternalLayer(skin) ? 1 : null;
};

export const getSwimmerFeatureLayerIndex = (
  skin: SwimmerSkinDefinition
): number | null => {
  'worklet';
  if (!skin.feature) {
    return null;
  }
  return skinHasInternalLayer(skin) ? 2 : 1;
};

export const getSwimmerAccessoryLayerIndex = (
  skin: SwimmerSkinDefinition
): number => {
  'worklet';
  let index = 1;
  if (skinHasInternalLayer(skin)) {
    index += 1;
  }
  if (skin.feature) {
    index += 1;
  }
  return index;
};

export const AQUA_SPROUT_SKIN: SwimmerSkinDefinition = {
  id: AQUA_SPROUT_SKIN_ID,
  profileId: GIGGLE_CRYSTAL_PROFILE_ID,
  bodyImageKey: SWIMMER_CHARACTER_IMAGE.aquaSproutBody,
  accessoryImageKey: SWIMMER_CHARACTER_IMAGE.aquaSproutHair,
  accessoryWidthRatio: 0.72,
  accessoryImageAspect: 242 / 228,
  /** Crest base (sprite bottom) aligned to body mesh top — not face-centered like goggles. */
  accessoryRestOffsetYRatio: -0.68,
  crestAccessory: true,
  internalMotion: 'ripple',
  blinkType: 'tinyDotBlink',
  feature: {
    featureImageKey: SWIMMER_CHARACTER_IMAGE.aquaSproutEyes,
    featureWidthRatio: 0.58,
    featureImageAspect: 250 / 50,
    /** Upper face band — between body center and crest base. */
    featureRestOffsetYRatio: -0.28,
  },
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
  if (skinId === AQUA_SPROUT_SKIN_ID) {
    return AQUA_SPROUT_SKIN;
  }
  return AQUA_SPROUT_SKIN;
};

export const getFeatureMeshSize = (
  feature: SwimmerSkinFeatureLayer,
  meshWidth: number
): { width: number; height: number } => {
  'worklet';
  const width = meshWidth * feature.featureWidthRatio;
  const height = width / feature.featureImageAspect;
  return { width, height };
};

export const getFeatureRestOffsetY = (
  feature: SwimmerSkinFeatureLayer,
  meshHeight: number,
  meshScaleY = 1
): number => {
  'worklet';
  return meshHeight * feature.featureRestOffsetYRatio * meshScaleY;
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

/** Pinned crest: align sprite bottom to squashed body top — prevents ceiling clip. */
export const getPinnedCrestRestOffsetY = (
  meshHeight: number,
  bodyScaleY: number,
  crestHeight: number
): number => {
  'worklet';
  const bodyTopY = -(meshHeight * bodyScaleY) / 2;
  return bodyTopY - crestHeight / 2;
};

export const buildSwimmerSkinRenderLayers = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number
): RenderLayerData[] => {
  'worklet';
  const layers: RenderLayerData[] = [
    {
      shape: {
        type: ShapeTypes.Rectangle,
        width: meshWidth,
        height: meshHeight,
      },
      image: skin.bodyImageKey,
    },
  ];

  if (skinHasInternalLayer(skin)) {
    const bandSize = getInternalRippleBandSize(meshWidth, meshHeight);
    layers.push({
      shape: {
        type: ShapeTypes.Rectangle,
        width: bandSize.width,
        height: bandSize.height,
      },
      fillColor: '#8fe8f5',
      blendMode: BlendMode.SoftLight,
      opacity: swimmerLifeTuning.INTERNAL_RIPPLE_OPACITY_MAX,
      position: { x: 0, y: meshHeight * 0.28 },
    });
  }

  if (skin.feature) {
    const featureSize = getFeatureMeshSize(skin.feature, meshWidth);
    layers.push({
      shape: {
        type: ShapeTypes.Rectangle,
        width: featureSize.width,
        height: featureSize.height,
      },
      image: skin.feature.featureImageKey,
      position: {
        x: 0,
        y: getFeatureRestOffsetY(skin.feature, meshHeight),
      },
      opacity: 1,
    });
  }

  const accessorySize = getAccessoryMeshSize(skin, meshWidth, meshHeight);
  layers.push({
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
  });

  return layers;
};
