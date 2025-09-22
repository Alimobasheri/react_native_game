import { Body } from 'matter-js';
import {
  AddMatterBodyRequest,
  AddMatterBodyRequestType,
  AddMatterBodyResponse,
  AddMatterBodyResponseType,
} from '../../events/physics';
import {
  System,
  SystemContext,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { MatterBodyComponentName } from '../../components/matterBody';

function createMatterBodyFromPayload(payload: AddMatterBodyRequest['payload']) {
  'worklet';
  const { type, options } = payload.args;

  switch (type) {
    case 'rectangle': {
      const { x, y, width, height, options: bodyOptions } = options;
      return global.MatterReanimated.Bodies.rectangle(
        x,
        y,
        width,
        height,
        bodyOptions // Optional chamfer and Matter.Body properties
      );
    }

    case 'trapezoid': {
      const { x, y, width, height, slope, options: bodyOptions } = options;
      return global.MatterReanimated.Bodies.trapezoid(
        x,
        y,
        width,
        height,
        slope,
        bodyOptions // Optional chamfer and Matter.Body properties
      );
    }

    case 'circle': {
      const { x, y, radius, maxSides, options: bodyOptions } = options;
      return global.MatterReanimated.Bodies.circle(
        x,
        y,
        radius,
        bodyOptions, // Optional Matter.Body properties
        maxSides // Optional maxSides
      );
    }

    case 'polygon': {
      const { x, y, sides, radius, options: bodyOptions } = options;
      return global.MatterReanimated.Bodies.polygon(
        x,
        y,
        sides,
        radius,
        bodyOptions // Optional chamfer and Matter.Body properties
      );
    }

    case 'fromVertices': {
      const {
        x,
        y,
        vertexSets,
        options: bodyOptions,
        flagInternal,
        removeCollinear,
        minimumArea,
        removeDuplicatePoints,
      } = options;
      return global.MatterReanimated.Bodies.fromVertices(
        x,
        y,
        vertexSets,
        bodyOptions, // Optional Matter.Body properties
        flagInternal, // Optional, defaults to undefined if not provided
        removeCollinear, // Optional, defaults to undefined if not provided
        minimumArea, // Optional, defaults to undefined if not provided
        removeDuplicatePoints // Optional, defaults to undefined if not provided
      );
    }

    default:
      throw new Error(`Unsupported Matter.Bodies type: ${type}`);
  }
}

export const requestAddMatterBody: System = {
  requiredComponents: [],
  requiredEvents: [AddMatterBodyRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AddMatterBodyRequestType);
    for (let i = 0; i < events.length; i++) {
      const payload: AddMatterBodyRequest['payload'] = events[i].payload;

      const body = createMatterBodyFromPayload(payload);

      global.MatterReanimated.Composite.add(
        global._RNTGE_.physics.engine.world,
        [body]
      );

      ecs.value.addComponent(payload.entityId, {
        name: MatterBodyComponentName,
        data: body,
      });
      const responseEvent: AddMatterBodyResponse = {
        type: AddMatterBodyResponseType,
        payload: { success: true, bodyId: body.id },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addAwaitingExternalEvent(responseEvent);
    }
  },
};
