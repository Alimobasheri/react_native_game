import {
  AddMatterBodyBatchRequest,
  AddMatterBodyBatchRequestType,
  AddMatterBodyBatchResponse,
  AddMatterBodyBatchResponseType,
} from '../../events/physics';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { MatterBodyComponentName } from '../../components/matterBody';

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
  process: (entities, components, eventQueue, deltaTime, ecs) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AddMatterBodyBatchRequestType);

    for (const event of events) {
      const payload: AddMatterBodyBatchRequest['payload'] = event.payload;
      const createdBodies = [];
      const bodyIds: number[] = [];

      for (const item of payload.batch) {
        const body = createMatterBodyFromPayload(item.args);
        body.id = item.entityId; // Crucially align body ID with entity ID
        createdBodies.push(body);
        bodyIds.push(body.id);
        ecs.value.addComponent(item.entityId, {
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

      const responseEvent: AddMatterBodyBatchResponse = {
        type: AddMatterBodyBatchResponseType,
        payload: { success: true, bodyIds },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addAwaitingExternalEvent(responseEvent);
    }
  },
};
