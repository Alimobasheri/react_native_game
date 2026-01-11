import { System } from '../../../services-ecs/system';
import {
  SceneRegisterRequest,
  SceneRegisterRequestType,
  SceneRegisteredResponseType,
} from '../../../components-rntge/Scene/events';
import { SceneComponentName, SceneComponentData } from '../../components/scene';

export const registerSceneSystem: System = {
  requiredComponents: [],
  requiredEvents: [SceneRegisterRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === SceneRegisterRequestType);

    for (let i = 0; i < events.length; i++) {
      const payload = events[i].payload as SceneRegisterRequest['payload'];

      const entity = ecs.value.createEntity();
      const data: SceneComponentData = {
        sceneKey: payload.sceneKey,
        parentSceneKey: payload.parentSceneKey,
        isActive: payload.isActive,
        isPaused: payload.isActive,
        isPreloading: false,
        zIndex: payload.zIndex ?? 0,
      };
      ecs.value.addComponent(entity, { name: SceneComponentName, data });

      eventQueue.addAwaitingExternalEvent({
        type: SceneRegisteredResponseType,
        payload: { sceneKey: payload.sceneKey },
        subscriptionId: payload.subscriptionId,
      });
    }
  },
};
