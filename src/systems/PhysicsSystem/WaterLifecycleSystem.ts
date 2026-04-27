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
  RenderComponentData,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';

const DEFAULT_GAP_START = 1 / 6;
const DEFAULT_GAP_END = 5 / 6;

export const createWaterLifecycleSystem = (params: {
  sceneKey: string;
  raisingSpeed: number;
}): System => {
  const { sceneKey, raisingSpeed } = params;

  return {
    name: `waterLifecycleSystem:${sceneKey}`,
    requiredComponents: [],
    process: ({ ecs, components, dimensions }) => {
      'worklet';

      const sceneEntities = ecs.getEntitiesWithComponents([SceneComponentName]);
      const sceneEntity = sceneEntities.find((entityId) => {
        const sceneData = components[SceneComponentName]?.get(entityId) as
          | SceneComponentData
          | undefined;
        return sceneData?.sceneKey === sceneKey;
      });

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

      const initialWaterLevel = 0.5;
      const canvasWidth = dimensions.value.width || 0;
      const canvasHeight = dimensions.value.height || 0;

      const waterEntity = ecs.createEntity();
      ecs.addComponent(
        waterEntity,
        createWaterComponent({
          containerEntityId: containerEntity,
          raisingSpeed,
          baseSpeed: raisingSpeed,
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
          zIndex: 1,
          shader: {
            key: 'water',
            uniforms: {
              iTime: 0,
              height: 0.5,
              heightOffset: 0.5,
              waterLevel: initialWaterLevel,
              frequency: 1,
              amplitude: 0.1,
              speed: 0.05,
              dynamicWaveX: containerData.centerX,
              dynamicWave: [0, 0, 0, 0],
              heightOffsetFreq: 0.5,
              heightOffsetAmp: 0.0,
              waterColor: [28, 163, 236].map((c) => c / 255),
              canvasSize: [canvasWidth, canvasHeight],
              containerCenter: [containerData.centerX, containerData.centerY],
              containerWidth: containerData.width,
              containerHeight: containerData.height,
              uGapCurrent: [DEFAULT_GAP_START, DEFAULT_GAP_END],
              uGapPrev: [DEFAULT_GAP_START, DEFAULT_GAP_END],
              uGapBlend: 1,
              uFlowDir: 0,
              uGapCenter: 0.5,
              uGapWidth: 2 / 3,
              uSurfaceBandCenterY: initialWaterLevel,
              uSurfaceBandHalfHeight: 0.08,
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
              uCurveAmp: 0.008,
              uCurveTilt: 0,
            },
          },
        })
      );

      ecs.updateComponent<SceneComponentData>(
        sceneEntity,
        SceneComponentName,
        (scene) => {
          if (!scene.objects.entities.includes(waterEntity)) {
            scene.objects.entities.push(waterEntity);
          }
        }
      );
    },
  };
};
