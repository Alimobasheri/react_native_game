import { System } from '../../../services-ecs/system';
import {
  SceneSetActiveRequestType,
  SceneSetPreloadStateRequestType,
} from '../../../components-rntge/Scene/events';
import { SceneComponentName, SceneComponentData } from '../../components/scene';

export const sceneStateSystem: System = {
  requiredComponents: [],
  requiredEvents: [SceneSetActiveRequestType, SceneSetPreloadStateRequestType],
  process: ({ eventQueue, ecs, components }) => {
    'worklet';
    const events = eventQueue.readEvents();

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.type === SceneSetActiveRequestType) {
        const payload = e.payload as {
          sceneKey: string;
          isActive: boolean;
          isPaused?: boolean;
        };
        const sceneEntities = ecs.value.getEntitiesWithComponents([
          SceneComponentName,
        ]);
        for (let j = 0; j < sceneEntities.length; j++) {
          const comp = ecs.value.components.value[SceneComponentName]?.get(
            sceneEntities[j]
          ) as SceneComponentData | undefined;
          if (comp && comp.sceneKey === payload.sceneKey) {
            ecs.value.updateComponent<SceneComponentData>(
              sceneEntities[j],
              SceneComponentName,
              (sc) => {
                sc.isActive = payload.isActive;
                sc.isPaused = !!payload.isPaused;
              }
            );
          }
        }
      } else if (e.type === SceneSetPreloadStateRequestType) {
        const payload = e.payload as {
          sceneKey: string;
          isPreloading: boolean;
        };
        const entities = ecs.value.getAllEntities();
        for (let j = 0; j < entities.length; j++) {
          const comp = ecs.value.components.value[SceneComponentName]?.get(
            entities[j]
          ) as SceneComponentData | undefined;
          if (comp && comp.sceneKey === payload.sceneKey) {
            ecs.value.updateComponent<SceneComponentData>(
              entities[j],
              SceneComponentName,
              (sc) => {
                sc.isPreloading = payload.isPreloading;
              }
            );
          }
        }
      }
    }
  },
};
