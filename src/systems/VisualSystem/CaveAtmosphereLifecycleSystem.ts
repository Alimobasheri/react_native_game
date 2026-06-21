import { BlendMode } from '@shopify/react-native-skia';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  CaveAtmosphereComponentName,
  createCaveAtmosphereComponent,
} from '@/Game/ecs-components/CaveAtmosphere';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import {
  CAVE_ATMOSPHERE_GRADIENT_SHADER_KEY,
  CAVE_ATMOSPHERE_VIGNETTE_SHADER_KEY,
  CAVE_COLOR_BOTTOM,
  CAVE_COLOR_MID,
  CAVE_COLOR_TOP,
  CAVE_LANE_LIFT,
  CAVE_MID_STOP,
  CAVE_VIGNETTE_ROUNDNESS,
  CAVE_VIGNETTE_SOFTNESS,
  CAVE_VIGNETTE_STRENGTH,
} from '@/config/swimmerCaveLightingTuning';
import { createScreenShaderOverlayComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/render/screenOverlay';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { findSceneEntityByKey } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';

export const createCaveAtmosphereLifecycleSystem = (params: {
  sceneKey: string;
}): System => {
  const { sceneKey } = params;

  return {
    name: `caveAtmosphereLifecycleSystem:${sceneKey}`,
    requiredComponents: [],
    process: ({ ecs, components, dimensions }) => {
      'worklet';

      const sceneEntity = findSceneEntityByKey(components, sceneKey);
      if (typeof sceneEntity !== 'number') return;

      const sceneData = components[SceneComponentName]?.get(sceneEntity) as
        | SceneComponentData
        | undefined;
      if (!sceneData?.isActive) return;

      const hasAtmosphere = sceneData.objects.entities.some((entityId) => {
        return !!components[CaveAtmosphereComponentName]?.get(entityId);
      });
      if (hasAtmosphere) return;

      const containerEntity = sceneData.objects.entities.find((entityId) => {
        return !!components[ContainerComponentName]?.get(entityId);
      });
      if (typeof containerEntity !== 'number') return;

      const containerData = components[ContainerComponentName]?.get(
        containerEntity
      ) as ContainerComponentData | undefined;
      if (!containerData) return;

      const canvasWidth = dimensions.value.width || 0;
      const canvasHeight = dimensions.value.height || 0;
      if (canvasWidth <= 0 || canvasHeight <= 0) return;

      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const laneCenterX = containerData.centerX / canvasWidth;
      const laneHalfWidth = containerData.width / (2 * canvasWidth);

      const gradientEntity = ecs.createEntity();
      ecs.addComponent(
        gradientEntity,
        createCaveAtmosphereComponent({ role: 'baseGradient' })
      );
      ecs.addComponent(
        gradientEntity,
        createScreenShaderOverlayComponent({
          centerX,
          centerY,
          width: canvasWidth,
          height: canvasHeight,
          shaderKey: CAVE_ATMOSPHERE_GRADIENT_SHADER_KEY,
          uniforms: {
            uResolution: [canvasWidth, canvasHeight],
            uColorTop: CAVE_COLOR_TOP,
            uColorMid: CAVE_COLOR_MID,
            uColorBottom: CAVE_COLOR_BOTTOM,
            uMidStop: CAVE_MID_STOP,
            uLaneCenterX: laneCenterX,
            uLaneHalfWidth: laneHalfWidth,
            uLaneLift: CAVE_LANE_LIFT,
          },
          renderLayer: SwimmerRenderLayer.CaveBase,
        })
      );

      const vignetteEntity = ecs.createEntity();
      ecs.addComponent(
        vignetteEntity,
        createCaveAtmosphereComponent({ role: 'edgeVignette' })
      );
      ecs.addComponent(
        vignetteEntity,
        createScreenShaderOverlayComponent({
          centerX,
          centerY,
          width: canvasWidth,
          height: canvasHeight,
          shaderKey: CAVE_ATMOSPHERE_VIGNETTE_SHADER_KEY,
          uniforms: {
            uResolution: [canvasWidth, canvasHeight],
            uStrength: CAVE_VIGNETTE_STRENGTH,
            uSoftness: CAVE_VIGNETTE_SOFTNESS,
            uRoundness: CAVE_VIGNETTE_ROUNDNESS,
          },
          renderLayer: SwimmerRenderLayer.CaveAtmosphere,
          blendMode: BlendMode.Multiply,
        })
      );

      ecs.updateComponent<SceneComponentData>(
        sceneEntity,
        SceneComponentName,
        (scene) => {
          'worklet';
          if (!scene.objects.entities.includes(gradientEntity)) {
            scene.objects.entities.push(gradientEntity);
          }
          if (!scene.objects.entities.includes(vignetteEntity)) {
            scene.objects.entities.push(vignetteEntity);
          }
        }
      );
    },
  };
};
