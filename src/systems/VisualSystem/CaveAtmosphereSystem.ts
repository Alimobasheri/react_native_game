import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  CaveAtmosphereComponentName,
  CaveAtmosphereComponentData,
} from '@/Game/ecs-components/CaveAtmosphere';
import {
  CAVE_ATMOSPHERE_GRADIENT_SHADER_KEY,
  CAVE_ATMOSPHERE_VIGNETTE_SHADER_KEY,
  CAVE_LANE_LIFT,
  CAVE_MID_STOP,
  CAVE_VIGNETTE_ROUNDNESS,
  CAVE_VIGNETTE_SOFTNESS,
  CAVE_VIGNETTE_STRENGTH,
} from '@/config/swimmerCaveLightingTuning';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';

const UNIFORM_EPS = 0.0005;

/**
 * Keeps cave atmosphere overlay shader uniforms in sync with viewport
 * and gameplay lane geometry (container center / width).
 */
export const CaveAtmosphereSystem: System = {
  name: 'caveAtmosphereSystem',
  requiredComponents: [CaveAtmosphereComponentName, RenderComponentName],
  process: ({ entities, components, dimensions, ecs }) => {
    'worklet';

    const canvasWidth = dimensions.value.width || 0;
    const canvasHeight = dimensions.value.height || 0;
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    const containerData = firstDataFromStore(components[ContainerComponentName]) as
      | ContainerComponentData
      | undefined;

    const laneCenterX = containerData
      ? containerData.centerX / canvasWidth
      : 0.5;
    const laneHalfWidth = containerData
      ? containerData.width / (2 * canvasWidth)
      : 0.4;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const resolutionW = canvasWidth;
    const resolutionH = canvasHeight;

    for (let i = 0; i < entities.length; i++) {
      const entityId = entities[i];
      const atmosphere = components[CaveAtmosphereComponentName]?.get(
        entityId
      ) as CaveAtmosphereComponentData | undefined;

      if (!atmosphere) continue;

      ecs.updateComponent<RenderComponentData>(
        entityId,
        RenderComponentName,
        (renderData) => {
          'worklet';
          if (!renderData?.shader) return;

          let dirty = false;

          if (renderData.position) {
            if (
              Math.abs(renderData.position.x - centerX) > UNIFORM_EPS ||
              Math.abs(renderData.position.y - centerY) > UNIFORM_EPS
            ) {
              renderData.position.x = centerX;
              renderData.position.y = centerY;
              dirty = true;
            }
          }

          if (renderData.shape.type === 'rectangle') {
            if (
              Math.abs(renderData.shape.width - canvasWidth) > UNIFORM_EPS ||
              Math.abs(renderData.shape.height - canvasHeight) > UNIFORM_EPS
            ) {
              renderData.shape.width = canvasWidth;
              renderData.shape.height = canvasHeight;
              dirty = true;
            }
          }

          const uniforms = renderData.shader.uniforms;

          if (atmosphere.role === 'baseGradient') {
            if (renderData.shader.key !== CAVE_ATMOSPHERE_GRADIENT_SHADER_KEY) {
              return;
            }

            const res = uniforms.uResolution as number[] | undefined;
            if (
              !res ||
              Math.abs(res[0] - resolutionW) > UNIFORM_EPS ||
              Math.abs(res[1] - resolutionH) > UNIFORM_EPS
            ) {
              uniforms.uResolution = [resolutionW, resolutionH];
              dirty = true;
            }
            if ((uniforms.uLaneCenterX as number) !== laneCenterX) {
              uniforms.uLaneCenterX = laneCenterX;
              dirty = true;
            }
            if ((uniforms.uLaneHalfWidth as number) !== laneHalfWidth) {
              uniforms.uLaneHalfWidth = laneHalfWidth;
              dirty = true;
            }
            if ((uniforms.uMidStop as number) !== CAVE_MID_STOP) {
              uniforms.uMidStop = CAVE_MID_STOP;
              dirty = true;
            }
            if ((uniforms.uLaneLift as number) !== CAVE_LANE_LIFT) {
              uniforms.uLaneLift = CAVE_LANE_LIFT;
              dirty = true;
            }
          } else if (atmosphere.role === 'edgeVignette') {
            if (renderData.shader.key !== CAVE_ATMOSPHERE_VIGNETTE_SHADER_KEY) {
              return;
            }

            const res = uniforms.uResolution as number[] | undefined;
            if (
              !res ||
              Math.abs(res[0] - resolutionW) > UNIFORM_EPS ||
              Math.abs(res[1] - resolutionH) > UNIFORM_EPS
            ) {
              uniforms.uResolution = [resolutionW, resolutionH];
              dirty = true;
            }
            if ((uniforms.uStrength as number) !== CAVE_VIGNETTE_STRENGTH) {
              uniforms.uStrength = CAVE_VIGNETTE_STRENGTH;
              dirty = true;
            }
            if ((uniforms.uSoftness as number) !== CAVE_VIGNETTE_SOFTNESS) {
              uniforms.uSoftness = CAVE_VIGNETTE_SOFTNESS;
              dirty = true;
            }
            if ((uniforms.uRoundness as number) !== CAVE_VIGNETTE_ROUNDNESS) {
              uniforms.uRoundness = CAVE_VIGNETTE_ROUNDNESS;
              dirty = true;
            }
          }

          if (dirty) {
            renderData.isDirty = true;
          }
        }
      );
    }
  },
};
