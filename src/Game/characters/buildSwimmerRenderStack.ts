import {
  RenderPolicy,
  ShapeTypes,
  type CompositeShaderInfo,
  type RenderLayerData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { getSwimmerInternalEffect, resolveInternalEffectChildImages } from '@/Shaders/SwimmerInternal/swimmerInternalEffectRegistry';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { resolveInternalMotionProfile } from '@/Game/characters/life/resolveInternalMotionProfile';
import {
  getAccessoryMeshSize,
  getAccessoryRestOffsetY,
  getCrestRestPosition,
  getFeatureMeshSize,
  getFeatureRestOffsetY,
  skinUsesCrestAnchorLayout,
  type SwimmerSkinDefinition,
} from './swimmerSkins';

export type SwimmerRenderStack = {
  /** When set, body is drawn through a motion-specific internal effect shader. */
  compositeShader?: CompositeShaderInfo;
  /** When no internal effect — draw body via top-level render.image. */
  bodyImageKey?: string;
  renderLayers: RenderLayerData[];
  renderPolicy: RenderPolicy;
};

const buildOverlayLayers = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number
): RenderLayerData[] => {
  'worklet';
  const renderLayers: RenderLayerData[] = [];

  if (skin.feature) {
    const featureSize = getFeatureMeshSize(skin.feature, meshWidth);
    renderLayers.push({
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

  renderLayers.push({
    shape: {
      type: ShapeTypes.Rectangle,
      width: accessorySize.width,
      height: accessorySize.height,
    },
    image: skin.accessoryImageKey,
    position: accessoryPosition,
    opacity: 1,
  });

  return renderLayers;
};

const buildDefaultUniforms = (
  effectId: 'ripple' | 'kelpSway',
  meshWidth: number,
  meshHeight: number,
  uniforms: Record<string, number | number[]>
): Record<string, number | number[]> => {
  'worklet';
  if (effectId === 'ripple') {
    return {
      uPhase: uniforms.uPhase ?? 0,
      uBreath: uniforms.uBreath ?? 0,
      uGlow: uniforms.uGlow ?? 0,
      uIntensity: uniforms.uIntensity ?? swimmerLifeTuning.INTERNAL_RIPPLE_INTENSITY,
      uJuiceBoost: uniforms.uJuiceBoost ?? 1,
      uDebugMode: uniforms.uDebugMode ?? 0,
      uMeshSize: uniforms.uMeshSize ?? [meshWidth, meshHeight],
      uFillOrigin: uniforms.uFillOrigin ?? [
        swimmerLifeTuning.INTERNAL_RIPPLE_FILL_ORIGIN_X,
        swimmerLifeTuning.INTERNAL_RIPPLE_FILL_ORIGIN_Y,
      ],
    };
  }

  return {
    uPhase: uniforms.uPhase ?? 0,
    uGlow: uniforms.uGlow ?? swimmerLifeTuning.INTERNAL_KELP_SWAY_GLOW,
    uIntensity:
      uniforms.uIntensity ?? swimmerLifeTuning.INTERNAL_KELP_SWAY_INTENSITY,
    uJuiceBoost: uniforms.uJuiceBoost ?? 1,
    uDebugMode: uniforms.uDebugMode ?? 0,
    uMeshSize: uniforms.uMeshSize ?? [meshWidth, meshHeight],
    uStrandRegion: uniforms.uStrandRegion ?? [
      swimmerLifeTuning.INTERNAL_KELP_STRAND_REGION_TOP,
      swimmerLifeTuning.INTERNAL_KELP_STRAND_REGION_BOTTOM,
    ],
    uKelpSway: uniforms.uKelpSway ?? [
      swimmerLifeTuning.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_X,
      swimmerLifeTuning.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_Y,
      swimmerLifeTuning.INTERNAL_KELP_SWAY_BEND_POWER,
    ],
    uSwayKinematic: uniforms.uSwayKinematic ?? [1, 0],
  };
};

export const buildSwimmerRenderStack = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number,
  uniforms: Record<string, number | number[]>
): SwimmerRenderStack => {
  'worklet';
  const profile = resolveInternalMotionProfile(skin.internalMotion);
  const effect = getSwimmerInternalEffect(profile);
  const renderLayers = buildOverlayLayers(skin, meshWidth, meshHeight);

  if (!effect) {
    return {
      bodyImageKey: skin.bodyImageKey,
      renderLayers,
      renderPolicy: RenderPolicy.LiveGroup,
    };
  }

  const compositeShader: CompositeShaderInfo = {
    key: effect.shaderKey,
    uniformKeys: effect.uniformKeys,
    uniforms: buildDefaultUniforms(effect.id, meshWidth, meshHeight, uniforms),
    childImages: resolveInternalEffectChildImages(effect.id, skin),
  };

  return {
    compositeShader,
    renderLayers,
    renderPolicy: RenderPolicy.AnimatedComposite,
  };
};
