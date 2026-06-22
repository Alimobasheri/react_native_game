import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { WaterComponentData, WaterComponentName } from '@/Game/ecs-components/Water';
import { swimmerWaterLightingTuning } from '@/config/swimmerWaterLightingTuning';

/**
 * Keeps water shader uniforms on the gameplay visual profile (streaks, surface band,
 * gap-aware alpha). Start screen uses the same look as active play — no idle blue pass.
 */
export const IdleWaterVisualSystem: System = {
  name: 'idleWaterVisualSystem',
  requiredComponents: [WaterComponentName, RenderComponentName],
  process: ({ entities, components, ecs }) => {
    'worklet';

    const bandHalfFromTuning = swimmerWaterLightingTuning.surfaceBandHeight * 0.5;
    const visualIntensity = 1;

    entities.forEach((waterEntity) => {
      const water = components[WaterComponentName]?.get(waterEntity) as
        | WaterComponentData
        | undefined;
      if (!water) return;

      ecs.updateComponent<WaterComponentData>(
        waterEntity,
        WaterComponentName,
        (w) => {
          w.visualIntensity = visualIntensity;
          w.surfaceBandHalfHeight = bandHalfFromTuning;
        }
      );

      ecs.updateComponent<RenderComponentData>(
        waterEntity,
        RenderComponentName,
        (render) => {
          'worklet';
          if (!render.shader?.uniforms) return;
          render.shader.uniforms.uVisualIntensity = visualIntensity;
          render.shader.uniforms.uSurfaceBandHalfHeight = bandHalfFromTuning;
        }
      );
    });
  },
};
