import {
  RenderPolicy,
  ShapeTypes,
  type CompositeShaderInfo,
  type RenderLayerData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { SWIMMER_INTERNAL_UNIFORM_KEYS } from '@/Shaders/SwimmerInternal/swimmerInternalComposite';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
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
  compositeShader: CompositeShaderInfo;
  renderLayers: RenderLayerData[];
  renderPolicy: RenderPolicy.AnimatedComposite;
};

export const buildSwimmerRenderStack = (
  skin: SwimmerSkinDefinition,
  meshWidth: number,
  meshHeight: number,
  uniforms: Record<string, number | number[]>
): SwimmerRenderStack => {
  'worklet';
  const compositeShader: CompositeShaderInfo = {
    key: 'swimmerInternal',
    uniformKeys: SWIMMER_INTERNAL_UNIFORM_KEYS,
    uniforms: {
      uPhase: uniforms.uPhase ?? 0,
      uBreath: uniforms.uBreath ?? 0,
      uGlow: uniforms.uGlow ?? 0,
      uIntensity: uniforms.uIntensity ?? 0,
      uJuiceBoost: uniforms.uJuiceBoost ?? 1,
      uDebugMode: uniforms.uDebugMode ?? 0,
      uMeshSize: uniforms.uMeshSize ?? [meshWidth, meshHeight],
      uFillOrigin: uniforms.uFillOrigin ?? [
        0.5,
        0.9,
      ],
      uMotionKind: uniforms.uMotionKind ?? 0,
      uStrandRegion: uniforms.uStrandRegion ?? [0, 1],
      uKelpSway: uniforms.uKelpSway ?? [
        swimmerLifeTuning.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_X,
        swimmerLifeTuning.INTERNAL_KELP_SWAY_TIP_AMPLITUDE_Y,
        swimmerLifeTuning.INTERNAL_KELP_SWAY_BEND_POWER,
      ],
    },
    childImages: [
      { imageKey: skin.bodyImageKey },
      { imageKey: skin.internalImageKey ?? skin.bodyImageKey },
    ],
  };

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

  return {
    compositeShader,
    renderLayers,
    renderPolicy: RenderPolicy.AnimatedComposite,
  };
};
