import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { WaterComponentData, WaterComponentName } from '@/Game/ecs-components/Water';
import {
  computeSpeedRampMultiplier,
  isSessionSpeedRampActive,
} from '@/Game/session/beginGameplay';
import { getGameSession, isStartReady } from '@/Game/session/gameSessionQuery';
import { swimmerWaterLightingTuning } from '@/config/swimmerWaterLightingTuning';
import { gameSessionTuning } from '@/config/swimmerTuning';

const VISUAL_INTENSITY_RAMP_PER_SECOND = 2.4;

/**
 * Drives idle/general water polish: calm surface, zero gameplay surge, and
 * smooth handoff of `visualIntensity` when the session leaves start_ready.
 */
export const IdleWaterVisualSystem: System = {
  name: 'idleWaterVisualSystem',
  requiredComponents: [WaterComponentName, RenderComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    const deltaSeconds = deltaTime / 1000;
    const session = getGameSession(components);
    const nowMs = Date.now();
    const isIdle = isStartReady(session);
    const rampActive = session ? isSessionSpeedRampActive(session, nowMs) : false;

    let visualTarget = isIdle ? 0 : 1;
    if (rampActive && session) {
      visualTarget = computeSpeedRampMultiplier(session, nowMs);
    }

    const bandHalfFromTuning = swimmerWaterLightingTuning.surfaceBandHeight * 0.5;

    entities.forEach((waterEntity) => {
      const water = components[WaterComponentName]?.get(waterEntity) as
        | WaterComponentData
        | undefined;
      if (!water) return;

      const currentIntensity = water.visualIntensity ?? 0;
      const blendStep = Math.min(
        1,
        VISUAL_INTENSITY_RAMP_PER_SECOND * deltaSeconds
      );
      const nextIntensity =
        currentIntensity + (visualTarget - currentIntensity) * blendStep;

      ecs.updateComponent<WaterComponentData>(
        waterEntity,
        WaterComponentName,
        (w) => {
          w.visualIntensity = nextIntensity;
          if (isIdle || nextIntensity < 0.12) {
            w.calmness = 1;
            w.surgeEnergy = 0;
            w.surgePhase = 0;
            w.surfaceCurveAmp = 0;
            w.surfaceCurveTilt = 0;
            w.flowVelocity = 0;
            w.flowDirection = 0;
            w.flowOffset = 0;
          }
          w.surfaceBandHalfHeight = bandHalfFromTuning;
        }
      );

      ecs.updateComponent<RenderComponentData>(
        waterEntity,
        RenderComponentName,
        (render) => {
          'worklet';
          if (!render.shader?.uniforms) return;
          render.shader.uniforms.uVisualIntensity = nextIntensity;
          render.shader.uniforms.uSurfaceBandHalfHeight = bandHalfFromTuning;
          if (isIdle) {
            render.shader.uniforms.speed =
              swimmerWaterLightingTuning.idleWaveSpeed *
              gameSessionTuning.VISUAL_RAISING_SPEED_RATIO *
              0.02;
          }
        }
      );
    });
  },
};
