import {
  ShapeTypes,
  type RenderLayerData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { SWIMMER_CHARACTER_IMAGE } from '@/assets/swimmerCharacters';
import { GIGGLE_CRYSTAL_PROFILE_ID } from './characterProfiles';

export const AQUA_SPROUT_SKIN_ID = 'aqua-sprout' as const;
export const KELP_DRIFTER_SKIN_ID = 'kelp-drifter' as const;
export const GOGGLED_SKIN_ID = 'goggled' as const;

export const DEFAULT_SWIMMER_SKIN_ID = AQUA_SPROUT_SKIN_ID;

export type SwimmerSkinId =
  | typeof AQUA_SPROUT_SKIN_ID
  | typeof KELP_DRIFTER_SKIN_ID
  | typeof GOGGLED_SKIN_ID;

export type SwimmerInternalMotionType = 'none' | 'ripple' | 'kelpSway';

export type SwimmerBlinkType = 'none' | 'tinyDotBlink' | 'sleepyBlink';

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
  /**
   * Sprite attachment point normalized 0–1 (left→right, top→bottom).
   * Used with `accessoryAttach*Ratio` for asymmetric crests (e.g. side-fringe hair).
   */
  readonly accessoryAnchorXRatio?: number;
  readonly accessoryAnchorYRatio?: number;
  /**
   * Side-fringe motion pivot on the sprite (left hair root) — separate from placement anchor.
   * When set, sideFringe pinning keeps this point fixed during skew/bob.
   */
  readonly accessoryMotionAnchorXRatio?: number;
  readonly accessoryMotionAnchorYRatio?: number;
  /** Body point where the sprite anchor attaches, as mesh fraction from center. */
  readonly accessoryAttachXRatio?: number;
  readonly accessoryAttachYRatio?: number;
  /** Optional tiny feature / eyes layer between body and crest (layer 1). */
  readonly feature?: SwimmerSkinFeatureLayer;
  /** When true, crest uses bottom-anchored bend spring instead of face lag. */
  readonly crestAccessory?: boolean;
  /** Upright stalk bend (aqua-sprout) vs side-combed fringe bob (kelp-drifter). */
  readonly crestAccessoryStyle?: 'upright' | 'sideFringe';
  /** Masked procedural motion inside the body rect (layer between body and feature). */
  readonly internalMotion?: SwimmerInternalMotionType;
  /** Tiny feature blink / pulse animation on the feature layer. */
  readonly blinkType?: SwimmerBlinkType;
};

export const SWIMMER_BODY_LAYER_INDEX = 0;

export const getSwimmerInternalLayerIndex = (): null => {
  'worklet';
  return null;
};

export const getSwimmerFeatureLayerIndex = (
  skin: SwimmerSkinDefinition
): number | null => {
  'worklet';
  return skin.feature ? 0 : null;
};

export const getSwimmerAccessoryLayerIndex = (
  skin: SwimmerSkinDefinition
): number => {
  'worklet';
  return skin.feature ? 1 : 0;
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
  crestAccessoryStyle: 'upright',
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

export const KELP_DRIFTER_SKIN: SwimmerSkinDefinition = {
  id: KELP_DRIFTER_SKIN_ID,
  profileId: GIGGLE_CRYSTAL_PROFILE_ID,
  bodyImageKey: SWIMMER_CHARACTER_IMAGE.kelpDrifterBody,
  accessoryImageKey: SWIMMER_CHARACTER_IMAGE.kelpDrifterHair,
  /** Side-fringe hair 438×407 — aligned via swimmer-layer-aligner.html */
  accessoryWidthRatio: 1.5,
  accessoryImageAspect: 438 / 407,
  /** Legacy fallback — crest anchor layout overrides placement when crestAccessory. */
  accessoryRestOffsetYRatio: -0.68,
  /** Aligner-tuned anchor on hair sprite (red dot) — do not change without aligner. */
  accessoryAnchorXRatio: 1 / 2,
  accessoryAnchorYRatio: 407 / 407,
  /** Left hair root — fixed during side-fringe skew (placement anchor stays bottom-center). */
  accessoryMotionAnchorXRatio: 0.18,
  accessoryMotionAnchorYRatio: 0.48,
  /** Aligner-tuned attach on body (green dot). */
  accessoryAttachXRatio: 0.209,
  accessoryAttachYRatio: -0.0025,
  crestAccessory: true,
  crestAccessoryStyle: 'sideFringe',
  internalMotion: 'kelpSway',
  blinkType: 'sleepyBlink',
  feature: {
    featureImageKey: SWIMMER_CHARACTER_IMAGE.kelpDrifterEyes,
    /** Sleepy curved marks — source eyes 188×22. */
    featureWidthRatio: 0.64,
    featureImageAspect: 188 / 22,
    featureRestOffsetYRatio: -0.2,
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
  if (skinId === KELP_DRIFTER_SKIN_ID) {
    return KELP_DRIFTER_SKIN;
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

export const skinUsesCrestAnchorLayout = (
  skin: SwimmerSkinDefinition
): boolean => {
  'worklet';
  return (
    skin.crestAccessory === true &&
    (skin.accessoryAnchorXRatio != null ||
      skin.accessoryAnchorYRatio != null ||
      skin.accessoryAttachXRatio != null ||
      skin.accessoryAttachYRatio != null)
  );
};

export const getCrestAnchorLocalOffset = (
  skin: SwimmerSkinDefinition,
  layerWidth: number,
  layerHeight: number
): { x: number; y: number } => {
  'worklet';
  const anchorX = skin.accessoryAnchorXRatio ?? 0.5;
  const anchorY = skin.accessoryAnchorYRatio ?? 1;
  return {
    x: layerWidth * (anchorX - 0.5),
    y: layerHeight * (anchorY - 0.5),
  };
};

export const getCrestRestPosition = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number,
  accessoryWidth: number,
  accessoryHeight: number,
  meshScaleX = 1,
  meshScaleY = 1
): { x: number; y: number } => {
  'worklet';
  const scaledAccessoryWidth = accessoryWidth * meshScaleX;
  const scaledAccessoryHeight = accessoryHeight * meshScaleY;
  const attachX = meshWidth * (skin.accessoryAttachXRatio ?? 0) * meshScaleX;
  const attachY = meshHeight * (skin.accessoryAttachYRatio ?? -0.5) * meshScaleY;
  const anchor = getCrestAnchorLocalOffset(
    skin,
    scaledAccessoryWidth,
    scaledAccessoryHeight
  );
  return {
    x: attachX - anchor.x,
    y: attachY - anchor.y,
  };
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

/** Pinned crest: align sprite anchor to squashed body top — prevents ceiling clip. */
export const getPinnedCrestRestPosition = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number,
  bodyScaleY: number,
  crestWidth: number,
  crestHeight: number
): { x: number; y: number } => {
  'worklet';
  if (skinUsesCrestAnchorLayout(skin)) {
    const bodyTopY = -(meshHeight * bodyScaleY) / 2;
    const attachX = meshWidth * (skin.accessoryAttachXRatio ?? 0);
    const anchor = getCrestAnchorLocalOffset(skin, crestWidth, crestHeight);
    return { x: attachX - anchor.x, y: bodyTopY - anchor.y };
  }
  const bodyTopY = -(meshHeight * bodyScaleY) / 2;
  return { x: 0, y: bodyTopY - crestHeight / 2 };
};

/** @deprecated Use buildSwimmerRenderStack — body is drawn via compositeShader. */
export const buildSwimmerSkinRenderLayers = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number
): RenderLayerData[] => {
  'worklet';
  const layers: RenderLayerData[] = [];

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
  const accessoryPosition = skinUsesCrestAnchorLayout(skin)
    ? getCrestRestPosition(
        skin,
        meshWidth,
        meshHeight,
        accessorySize.width,
        accessorySize.height
      )
    : {
        x: 0,
        y: getAccessoryRestOffsetY(skin, meshHeight),
      };
  layers.push({
    shape: {
      type: ShapeTypes.Rectangle,
      width: accessorySize.width,
      height: accessorySize.height,
    },
    image: skin.accessoryImageKey,
    position: accessoryPosition,
    opacity: 1,
  });

  return layers;
};
