import {
  createRenderComponent,
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  CreateEntityRequest,
  CreateEntityRequestType,
  RemoveEntityRequest,
  RemoveEntityRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  createObstacleComponent,
  ObstacleComponentData,
  ObstacleComponentName,
  ObstacleTypes,
} from '@/Game/ecs-components/ObstacleComponent';
import {
  SeaLayerComponentData,
  SeaLayerComponentName,
} from '@/Game/ecs-components/SeaLayer';

export const obstaclesSystem: System = {
  process: ({ ecs, components, eventQueue, dimensions }) => {
    'worklet';

    const existingObstacles: Entity[] = ecs.value.getEntitiesWithComponents([
      ObstacleComponentName,
    ]);

    const seaLayerEntities = ecs.value.getEntitiesWithComponents([
      SeaLayerComponentName,
    ]);

    if (seaLayerEntities.length < 1) return;

    const mainSeaLayerComp = seaLayerEntities
      .map((ent) => {
        const comp: SeaLayerComponentData =
          components[SeaLayerComponentName].get(ent);
        return comp;
      })
      .filter((comp) => comp && comp.isMainLayer)?.[0];

    if (!mainSeaLayerComp) return;

    if (existingObstacles.length > 0) {
      for (let i = 0; i < existingObstacles.length; i++) {
        const obstacleEntity = existingObstacles[i];

        const renderComp: RenderComponentData =
          components[RenderComponentName]?.get(obstacleEntity);
        const obstacleComp: ObstacleComponentData =
          components[ObstacleComponentName]?.get(obstacleEntity);

        if (!renderComp || !obstacleComp) return;
        if (
          !!renderComp.position &&
          renderComp.position.x <= -obstacleComp.width
        ) {
          const request: RemoveEntityRequest = {
            type: RemoveEntityRequestType,
            payload: {
              entityId: obstacleEntity,
            },
          };
          eventQueue.addEvent(request);
        } else {
          ecs.value.updateComponent<RenderComponentData>(
            obstacleEntity,
            RenderComponentName,
            (comp) => {
              if (!comp.position) return;
              let speed =
                mainSeaLayerComp.flowSpeed * mainSeaLayerComp.flowFrequency;
              const touchWave = mainSeaLayerComp.waves[1];
              if (touchWave && touchWave?.isFlowing) {
                speed += touchWave.speed * touchWave.frequency;
              }
              comp.position.x -= speed;
            }
          );
        }
      }
    } else {
      const obstacleSize = { width: 50, height: 100 };
      const obstaclePosition = {
        x: dimensions.value.width + 50,
        y: mainSeaLayerComp.y - obstacleSize.height / 2,
      };

      const obstacleComponent = createObstacleComponent({
        type: ObstacleTypes.Stone,
        width: obstacleSize.width,
        height: obstacleSize.height,
        initialPosition: obstaclePosition,
      });

      const renderComponent = createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: obstacleSize.width,
          height: obstacleSize.height,
        },
        position: obstaclePosition,
        fillColor: 'black',
      });

      const request: CreateEntityRequest = {
        type: CreateEntityRequestType,
        payload: {
          components: [obstacleComponent, renderComponent],
          sceneKey: 'game',
        },
      };
      eventQueue.addEvent(request);
    }
  },
};
