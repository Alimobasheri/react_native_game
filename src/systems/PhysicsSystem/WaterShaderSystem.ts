import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { ContainerComponentName, ContainerComponentData } from '@/Game/ecs-components/Container';
import { waterShaderRuntimeTuning } from '@/config/swimmerTuning';
import { syncWaterShaderGameplayUniforms } from '@/Game/water/syncWaterShaderGameplayUniforms';

/**
 * WaterShaderSystem - Updates water shader uniforms based on container water level
 *
 * This system:
 * - Updates shader uniforms (iTime, height, heightOffset) based on container water level
 * - Updates water position to follow water surface
 * - Keeps water visible only within container bounds
 */
export const WaterShaderSystem: System = {
  requiredComponents: [WaterComponentName, RenderComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    entities.forEach((waterEntity) => {
      const waterComponent = components[WaterComponentName]?.get(waterEntity);
      const renderData = components[RenderComponentName]?.get(waterEntity);

      if (!waterComponent || !renderData || !renderData.shader) {
        return;
      }

      const containerData = components[ContainerComponentName]?.get(
        waterComponent.containerEntityId
      ) as ContainerComponentData | undefined;

      if (!containerData) {
        return;
      }

      // Update shader uniforms only - don't change entity position
      ecs.updateComponent<RenderComponentData>(
        waterEntity,
        RenderComponentName,
        (renderComponent) => {
          'worklet';
          if (!renderComponent.shader) return;

          const uniforms = renderComponent.shader.uniforms;

          // Update time for animation
          uniforms.iTime =
            (uniforms.iTime as number || 0) +
            deltaTime / waterShaderRuntimeTuning.iTimeDeltaDivisor;

          // Calculate water level in container UV space (0 = container bottom, 1 = container top).
          const containerTop = containerData.centerY - containerData.height / 2;
          const containerHeight = containerData.height;

          // Water level as fraction of container height filled
          // waterSurfaceY is in screen coordinates (0 = top of screen)
          // Convert to container-relative position
          const waterLevelFromTop = (containerData.waterSurfaceY - containerTop) / containerHeight;
          uniforms.waterLevel = Math.max(0, Math.min(1, 1 - waterLevelFromTop));

          // Update container-specific uniforms for masking
          const containerCenterArray = uniforms.containerCenter as number[];
          if (containerCenterArray && containerCenterArray.length >= 2) {
            containerCenterArray[0] = containerData.centerX;
            containerCenterArray[1] = containerData.centerY;
          }
          uniforms.containerWidth = containerData.width;
          uniforms.containerHeight = containerData.height;
          syncWaterShaderGameplayUniforms(uniforms, waterComponent);
        }
      );
    });
  },
};
