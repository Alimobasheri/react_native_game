import {
  AddMatterBodyBatchRequest,
  AddMatterBodyBatchRequestType,
  AddMatterBodyBatchResponse,
  AddMatterBodyBatchResponseType,
} from '../../events/physics';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { MatterBodyComponentName } from '../../components/matterBody';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { SceneComponentName, SceneComponentData } from '../../components/scene';

function createMatterBodyFromPayload(
  args: AddMatterBodyBatchRequest['payload']['batch'][0]['args']
) {
  'worklet';
  const { type, options } = args;

  switch (type) {
    case 'rectangle': {
      const { x, y, width, height, options: bodyOptions } = options;
      return global.MatterReanimated.Bodies.rectangle(
        x,
        y,
        width,
        height,
        bodyOptions
      );
    }
    case 'circle': {
      const { x, y, radius, maxSides, options: bodyOptions } = options;
      return global.MatterReanimated.Bodies.circle(
        x,
        y,
        radius,
        bodyOptions,
        maxSides
      );
    }
    // Add other cases as needed from your original requestAddMatterBody system
    default:
      // It's useful to log the type for debugging, but console.log isn't available in worklets.
      // You might need a more sophisticated logging mechanism if this becomes an issue.
      throw new Error(`Unsupported Matter.Bodies type in batch: ${type}`);
  }
}

export const requestAddMatterBodyBatch: System = {
  requiredComponents: [],
  requiredEvents: [AddMatterBodyBatchRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    if (!global._RNTGE_.physics) return;
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AddMatterBodyBatchRequestType);

    const sceneEntities: Record<string, Entity> = ecs
      .getEntitiesWithComponents([SceneComponentName])
      .reduce((byKey, entity) => {
        const entityData = ecs.components[SceneComponentName].get(
          entity
        ) as SceneComponentData;
        return {
          ...byKey,
          [entityData.sceneKey]: entity,
        };
      }, {});

    for (const event of events) {
      const payload: AddMatterBodyBatchRequest['payload'] = event.payload;
      const createdBodies: Matter.Body[] = [];
      const bodyIds: number[] = [];

      for (const item of payload.batch) {
        const body = createMatterBodyFromPayload(item.args);
        body.id = item.entityId; // Crucially align body ID with entity ID
        createdBodies.push(body);
        bodyIds.push(body.id);
        ecs.addComponent(item.entityId, {
          name: MatterBodyComponentName,
          data: body,
        });
      }

      if (createdBodies.length > 0) {
        global.MatterReanimated.Composite.add(
          global._RNTGE_.physics.engine.world,
          createdBodies
        );
      }

      ecs.updateComponent<SceneComponentData>(
        sceneEntities[payload.sceneKey],
        SceneComponentName,
        (component) => {
          component.objects.matterBodies.push(
            ...createdBodies.map((cb) => cb.id)
          );
        }
      );

      const responseEvent: AddMatterBodyBatchResponse = {
        type: AddMatterBodyBatchResponseType,
        payload: { success: true, bodyIds },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addAwaitingExternalEvent(responseEvent);
    }
  },
};
