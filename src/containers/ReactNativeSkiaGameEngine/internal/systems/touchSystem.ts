import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentName,
  RenderComponentData,
  ShapeTypes,
} from '../components/render';
import {
  TouchComponentName,
  TouchComponentData,
  TouchInputEvent,
  GestureKinds,
  TouchEventTypes,
} from '../components/touch';

export const TouchInputEventType = 'rntge/touch/input' as const;

const pointInRect = (
  px: number,
  py: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number
) => {
  'worklet';
  const left = centerX - width / 2;
  const top = centerY - height / 2;
  return px >= left && px <= left + width && py >= top && py <= top + height;
};

const pointInCircle = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
) => {
  'worklet';
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
};

const pointInPolygon = (
  px: number,
  py: number,
  vertices: { x: number; y: number }[]
) => {
  'worklet';
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y;
    const xj = vertices[j].x,
      yj = vertices[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

function getShapeForEntity(
  render?: RenderComponentData,
  touch?: TouchComponentData
) {
  'worklet';
  const shape = touch?.shape ?? render?.shape;
  return shape;
}

export const touchSystem: System = {
  requiredComponents: [RenderComponentName],
  requiredEvents: [TouchInputEventType],
  process: ({ entities, components, eventQueue, ecs }) => {
    'worklet';

    const events = eventQueue
      .readEvents()
      .filter((e: any) => e.type === TouchInputEventType) as TouchInputEvent[];

    if (events.length === 0) return;

    if (!global._RNTGE_.TouchState) {
      global._RNTGE_.TouchState = {
        activePointers: new Map<
          number,
          { entityId: number | null; captured: boolean }
        >(),
      };
    }
    const state = global._RNTGE_.TouchState;

    const touchEntities = ecs.value.getEntitiesWithComponents([
      TouchComponentName,
    ]);
    for (let evIndex = 0; evIndex < events.length; evIndex++) {
      const ev = events[evIndex].payload;

      // Extract position data based on gesture kind
      let px = 0;
      let py = 0;

      switch (ev.gesture.kind) {
        case GestureKinds.Pan:
        case GestureKinds.Tap:
        case GestureKinds.LongPress: {
          const gestureData = ev.gesture.data as any;
          px = gestureData.x ?? 0;
          py = gestureData.y ?? 0;
          break;
        }
        case GestureKinds.Generic:
        default: {
          // Generic gestures may not have position data
          px = 0;
          py = 0;
          break;
        }
      }

      const pointerId = ev.pointerId ?? 0;
      const evtType = ev.eventType;

      let hitEntity: number | null = null;
      let hitPriority = -Infinity;

      for (let i = touchEntities.length - 1; i >= 0; i--) {
        const ent = touchEntities[i];
        const renderData: RenderComponentData | undefined =
          components[RenderComponentName].get(ent);
        if (!renderData || renderData.visible === false) continue;

        let pos = renderData.position ?? { x: 0, y: 0 };
        const shape = getShapeForEntity(
          renderData,
          components[TouchComponentName]?.get(ent)
        );

        let collided = false;
        if (!shape) {
          continue;
        }
        switch (shape.type) {
          case ShapeTypes.Rectangle: {
            const w = shape.width ?? 0;
            const h = shape.height ?? 0;
            collided = pointInRect(px, py, pos.x, pos.y, w, h);
            break;
          }
          case ShapeTypes.Circle: {
            const r = shape.radius ?? 0;
            collided = pointInCircle(px, py, pos.x, pos.y, r);
            break;
          }
          case ShapeTypes.Polygon: {
            if (!shape.vertices) break;
            const vertices = shape.vertices.map((v) => ({
              x: v.x + pos.x,
              y: v.y + pos.y,
            }));
            collided = pointInPolygon(px, py, vertices);
            break;
          }
        }
        if (!collided) continue;

        const touchComp = components[TouchComponentName]?.get(ent) as
          | TouchComponentData
          | undefined;
        const priority = touchComp?.priority ?? renderData.zIndex ?? 0;
        if (priority > hitPriority) {
          hitEntity = ent;
          hitPriority = priority;

          if (touchComp?.capture) break;
        }
      }

      if (
        evtType === TouchEventTypes.Start ||
        evtType === TouchEventTypes.Tap ||
        evtType === TouchEventTypes.LongPress
      ) {
        state.activePointers.set(pointerId, {
          entityId: hitEntity,
          captured: !!(hitEntity !== null),
        });
        if (hitEntity !== null) {
          const touchComp = components[TouchComponentName]?.get(hitEntity) as
            | TouchComponentData
            | undefined;
          const payload = {
            pointerId,
            x: px,
            y: py,
            type: evtType,
            timestamp: ev.timestamp,
            raw: ev.meta,
          };

          if (touchComp?.onGestureStart) {
            try {
              (touchComp.onGestureStart as any)(payload);
            } catch (err) {
              // if callback is JS-only, route via eventQueue to JS
              eventQueue.addAwaitingExternalEvent({
                type: 'rntge/touch/callback',
                payload: {
                  entityId: hitEntity,
                  name: 'onGestureStart',
                  data: payload,
                },
                subscriptionId: '',
              });
            }
          }
        } else {
          // no entity hit — optionally nothing
        }
      } else if (evtType === TouchEventTypes.Move) {
        const active = state.activePointers.get(pointerId);
        const targetEntity = active?.entityId ?? null;
        if (targetEntity !== null) {
          const touchComp = components[TouchComponentName]?.get(
            targetEntity
          ) as TouchComponentData | undefined;
          if (touchComp?.onGesture) {
            try {
              (touchComp.onGesture as any)({
                pointerId,
                x: px,
                y: py,
                type: TouchEventTypes.Move,
                timestamp: ev.timestamp,
              });
            } catch (err) {
              eventQueue.addAwaitingExternalEvent({
                type: 'rntge/touch/callback',
                payload: {
                  entityId: targetEntity,
                  name: 'onGesture',
                  data: { pointerId, x: px, y: py },
                },
                subscriptionId: '',
              });
            }
          }
        }
      } else if (
        evtType === TouchEventTypes.End ||
        evtType === TouchEventTypes.Cancel
      ) {
        const active = state.activePointers.get(pointerId);
        const targetEntity = active?.entityId ?? null;
        if (targetEntity !== null) {
          const touchComp = components[TouchComponentName]?.get(
            targetEntity
          ) as TouchComponentData | undefined;
          if (touchComp?.onGestureEnd) {
            try {
              (touchComp.onGestureEnd as any)({
                pointerId,
                x: px,
                y: py,
                type: evtType,
                timestamp: ev.timestamp,
              });
            } catch (err) {
              eventQueue.addAwaitingExternalEvent({
                type: 'rntge/touch/callback',
                payload: {
                  entityId: targetEntity,
                  name: 'onGestureEnd',
                  data: { pointerId, x: px, y: py },
                },
                subscriptionId: '',
              });
            }
          }
        }
        // cleanup pointer
        state.activePointers.delete(pointerId);
      }
    } // end events loop
  },
};
