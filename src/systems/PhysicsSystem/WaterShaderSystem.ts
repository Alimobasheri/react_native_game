import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { ContainerComponentName, ContainerComponentData } from '@/Game/ecs-components/Container';

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
  process: ({ entities, components, deltaTime, ecs, dimensions }) => {
    'worklet';

    // Get container entities
    const containerEntities = ecs.getEntitiesWithComponents([
      ContainerComponentName,
    ]);

    if (containerEntities.length === 0) {
      return; // No container, nothing to do
    }

    entities.forEach((waterEntity) => {
      const waterComponent = components[WaterComponentName]?.get(waterEntity);
      const renderData = components[RenderComponentName]?.get(waterEntity);

      if (!waterComponent || !renderData || !renderData.shader) {
        return;
      }

      // Find the container this water belongs to
      const containerEntity = containerEntities.find(
        (id) => id === waterComponent.containerEntityId
      );

      if (!containerEntity) {
        return;
      }

      const containerData = components[ContainerComponentName]?.get(
        containerEntity
      ) as ContainerComponentData | undefined;

      if (!containerData) {
        return;
      }

      // Use container's waterSurfaceY to calculate water level

      // Update shader uniforms only - don't change entity position
      ecs.updateComponent<RenderComponentData>(
        waterEntity,
        RenderComponentName,
        (renderComponent) => {
          'worklet';
          if (!renderComponent.shader) return;

          const uniforms = renderComponent.shader.uniforms;

          // Update time for animation
          uniforms.iTime = (uniforms.iTime as number || 0) + deltaTime / 100;

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
          uniforms.uGapCurrent = [
            waterComponent.currentGapStartNorm ?? 1 / 6,
            waterComponent.currentGapEndNorm ?? 5 / 6,
          ];
          uniforms.uGapPrev = [
            waterComponent.prevGapStartNorm ?? 1 / 6,
            waterComponent.prevGapEndNorm ?? 5 / 6,
          ];
          uniforms.uGapBlend = waterComponent.gapBlend ?? 1;
          uniforms.uFlowDir = waterComponent.flowDirection ?? 0;
          uniforms.uGapCenter = waterComponent.gapCenterNorm ?? 0.5;
          uniforms.uGapWidth = waterComponent.gapWidthNorm ?? 2 / 3;
          uniforms.uSurfaceBandCenterY = waterComponent.surfaceBandCenterY ?? uniforms.waterLevel as number;
          uniforms.uSurfaceBandHalfHeight = waterComponent.surfaceBandHalfHeight ?? 0.08;
          uniforms.uSurge = waterComponent.surgePhase ?? 0;
          uniforms.uPeakHeight = waterComponent.peakHeight ?? 0.008;
          uniforms.uPeakSharpness = waterComponent.peakSharpness ?? 0.1;
          uniforms.uTroughDepth = waterComponent.troughDepth ?? 0.006;
          uniforms.uFlowWaveSpeedScale = waterComponent.flowWaveSpeedScale ?? 0.00005;
        }
      );
    });
  },
};
