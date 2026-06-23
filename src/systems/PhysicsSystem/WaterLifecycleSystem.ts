import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  createWaterComponent,
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import { createPositionComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { findSceneEntityByKey } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { waterShaderRuntimeTuning } from '@/config/swimmerTuning';
import { buildWaterLightingShaderUniforms } from '@/config/buildWaterLightingShaderUniforms';
import { swimmerWaterLightingTuning, WATER_COLOR_MID_RGB } from '@/config/swimmerWaterLightingTuning';
import { BlendMode } from '@shopify/react-native-skia';

const DEFAULT_GAP_START = 1 / 6;
const DEFAULT_GAP_END = 5 / 6;

const WATER_COLOR_RGB = WATER_COLOR_MID_RGB;
const lightingUniforms = buildWaterLightingShaderUniforms();

export const createWaterLifecycleSystem = (params: {
  sceneKey: string;
  raisingSpeed: number;
  /** Multiplies water shader paint alpha. Lower = clearer swimmer beneath. */
  shaderOpacity?: number;
}): System => {
  const { sceneKey, raisingSpeed, shaderOpacity } = params;

  return {
    name: `waterLifecycleSystem:${sceneKey}`,
    requiredComponents: [],
    process: ({ ecs, components, dimensions }) => {
      'worklet';

      const sceneEntity = findSceneEntityByKey(components, sceneKey);

      if (typeof sceneEntity !== 'number') return;

      const sceneData = components[SceneComponentName]?.get(sceneEntity) as
        | SceneComponentData
        | undefined;
      if (!sceneData?.isActive) return;

      const containerEntity = sceneData.objects.entities.find((entityId) => {
        return !!components[ContainerComponentName]?.get(entityId);
      });
      if (typeof containerEntity !== 'number') return;

      const containerData = components[ContainerComponentName]?.get(
        containerEntity
      ) as ContainerComponentData | undefined;
      if (!containerData) return;

      const existingWaterEntity = sceneData.objects.entities.find((entityId) => {
        const water = components[WaterComponentName]?.get(entityId) as
          | WaterComponentData
          | undefined;
        return water?.containerEntityId === containerEntity;
      });
      if (typeof existingWaterEntity === 'number') {
        return;
      }

      const initialWaterLevel = swimmerWaterLightingTuning.waterBaseHeight;
      const canvasWidth = dimensions.value.width || 0;
      const canvasHeight = dimensions.value.height || 0;
      const waterOpacity =
        typeof shaderOpacity === 'number'
          ? shaderOpacity
          : waterShaderRuntimeTuning.DEFAULT_RENDER_OPACITY;

      const waterEntity = ecs.createEntity();
      ecs.addComponent(
        waterEntity,
        createWaterComponent({
          containerEntityId: containerEntity,
          raisingSpeed,
          baseSpeed: raisingSpeed,
          visualIntensity: 1,
        })
      );
      ecs.addComponent(
        waterEntity,
        createPositionComponent({
          x: containerData.centerX,
          y: containerData.centerY,
        })
      );
      ecs.addComponent(
        waterEntity,
        createRenderComponent({
          shape: {
            type: ShapeTypes.Rectangle,
            width: containerData.width,
            height: containerData.height,
          },
          position: { x: containerData.centerX, y: containerData.centerY },
          visible: true,
          renderLayer: SwimmerRenderLayer.Water,
          opacity: waterOpacity,
          blendMode: BlendMode.Screen,
          shader: {
            key: 'water',
            uniforms: {
              iTime: 0,
              height: 0.5,
              heightOffset: 0.5,
              waterLevel: initialWaterLevel,
              frequency: swimmerWaterLightingTuning.idleWaveSpatialFreq,
              amplitude: swimmerWaterLightingTuning.idleWaveAmplitude,
              speed: swimmerWaterLightingTuning.idleWaveSpeed * 0.02,
              dynamicWaveX: containerData.centerX,
              dynamicWave: [0, 0, 0, 0],
              heightOffsetFreq: 0.5,
              heightOffsetAmp: 0.0,
              waterColor: WATER_COLOR_RGB,
              canvasSize: [canvasWidth, canvasHeight],
              containerCenter: [containerData.centerX, containerData.centerY],
              containerWidth: containerData.width,
              containerHeight: containerData.height,
              uGapCurrent: [DEFAULT_GAP_START, DEFAULT_GAP_END],
              uGapPrev: [DEFAULT_GAP_START, DEFAULT_GAP_END],
              uGapCurr01: [DEFAULT_GAP_START, DEFAULT_GAP_END, 0, 0],
              uGapCurr23: [0, 0, 0, 0],
              uGapPrev01: [DEFAULT_GAP_START, DEFAULT_GAP_END, 0, 0],
              uGapPrev23: [0, 0, 0, 0],
              uFlowPerRange: [0, 0, 0, 0],
              uAmpPerRange: [0.008, 0, 0, 0],
              uHybridGapMaskStrength: 0.9,
              uGapBlend: 1,
              uFlowDir: 0,
              uGapCenter: 0.5,
              uGapWidth: 2 / 3,
              uSurfaceBandCenterY: initialWaterLevel,
              uSurfaceBandHalfHeight: swimmerWaterLightingTuning.surfaceBandHeight * 0.5,
              uSurge: 0,
              uPeakHeight: 0.001,
              uPeakSharpness: 1,
              uTroughDepth: 0.006,
              uFlowWaveSpeedScale: 0.0005,
              uFlowVelocity: 0,
              uFlowOffset: 0,
              uSurgeEnergy: 0,
              uCalmness: 0.5,
              uCurveCenter: 0.5,
              uCurveAmp: 0,
              uCurveTilt: 0,
              ...lightingUniforms,
            },
          },
        })
      );

      ecs.updateComponent<SceneComponentData>(
        sceneEntity,
        SceneComponentName,
        (scene) => {
          'worklet';
          if (!scene.objects.entities.includes(waterEntity)) {
            scene.objects.entities.push(waterEntity);
          }
        }
      );
    },
  };
};
