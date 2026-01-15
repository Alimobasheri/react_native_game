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
  TapComponentName,
  TapComponentData,
  PanComponentName,
  PanComponentData,
  LongPressComponentName,
  LongPressComponentData,
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
  const result =
    px >= left && px <= left + width && py >= top && py <= top + height;
  return result;
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

function getShapeForGestureEntity(
  render?: RenderComponentData,
  gestureComp?: { shape?: any }
) {
  'worklet';
  const shape = gestureComp?.shape ?? render?.shape;
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
        pan: {
          activePointers: new Map<
            number,
            { entityId: number | null; captured: boolean }
          >(),
        },
        tap: {},
        longPress: {},
      };
    }
    const state = global._RNTGE_.TouchState;

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

      const gestureKind = ev.gesture.kind;
      let componentName: string;
      let gestureEntities: number[];
      let gestureState: any;

      switch (gestureKind) {
        case GestureKinds.Pan:
          componentName = PanComponentName;
          gestureEntities = ecs.value.getEntitiesWithComponents([
            RenderComponentName,
            PanComponentName,
          ]);
          gestureState = state.pan;
          break;
        case GestureKinds.Tap:
          componentName = TapComponentName;
          gestureEntities = ecs.value.getEntitiesWithComponents([
            RenderComponentName,
            TapComponentName,
          ]);
          gestureState = state.tap;
          break;
        case GestureKinds.LongPress:
          componentName = LongPressComponentName;
          gestureEntities = ecs.value.getEntitiesWithComponents([
            RenderComponentName,
            LongPressComponentName,
          ]);
          gestureState = state.longPress;
          break;
        default:
          continue;
      }

      if (gestureEntities.length < 1) return;

      const pointerId = ev.pointerId ?? 0;
      const evtType = ev.eventType;

      // Helper function to find hit entity by boundary checking
      const findHitEntity = () => {
        let hitEntity: number | null = null;
        let hitPriority = -Infinity;

        for (let i = gestureEntities.length - 1; i >= 0; i--) {
          const ent = gestureEntities[i];
          const renderData: RenderComponentData | undefined =
            components[RenderComponentName].get(ent);
          if (!renderData || renderData.visible === false) continue;

          let pos = renderData.position ?? { x: 0, y: 0 };
          const gestureComp = components[componentName]?.get(ent) as any;
          const shape = getShapeForGestureEntity(renderData, gestureComp);

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
              const vertices = shape.vertices.map(
                (v: { x: number; y: number }) => ({
                  x: v.x + pos.x,
                  y: v.y + pos.y,
                })
              );
              collided = pointInPolygon(px, py, vertices);
              break;
            }
          }
          if (!collided) continue;

          const priority = gestureComp?.priority ?? renderData.zIndex ?? 0;
          if (priority > hitPriority) {
            hitEntity = ent;
            hitPriority = priority;

            if (gestureComp?.capture) break;
          }
        }
        return hitEntity;
      };

      let hitEntity: number | null = null;

      if (gestureKind === GestureKinds.Pan) {
        if (evtType === TouchEventTypes.Start) {
          hitEntity = findHitEntity();
        } else if (
          evtType === TouchEventTypes.Move ||
          evtType === TouchEventTypes.End ||
          evtType === TouchEventTypes.Cancel
        ) {
          const active = gestureState.activePointers.get(pointerId);
          if (active?.entityId !== null) {
            const gestureComp = components[componentName]?.get(
              active.entityId
            ) as any;
            if (gestureComp?.checkBoundsOnUpdate) {
              hitEntity = findHitEntity();
              if (hitEntity !== active.entityId) {
                hitEntity = null;
              }
            } else {
              hitEntity = active.entityId;
            }
          }
        }
      } else {
        hitEntity = findHitEntity();
      }

      if (hitEntity !== null) {
        const gestureComp = components[componentName]?.get(hitEntity) as any;
        const payload = {
          entityId: hitEntity,
          pointerId,
          x: px,
          y: py,
          timestamp: ev.timestamp,
          raw: ev.meta,
          gesture: ev.gesture,
        };

        if (gestureKind === GestureKinds.Pan) {
          if (evtType === TouchEventTypes.Start) {
            gestureState.activePointers.set(pointerId, {
              entityId: hitEntity,
              captured: !!gestureComp?.capture,
            });
            if (gestureComp?.onPanStart) {
              try {
                (gestureComp.onPanStart as any)(payload);
              } catch (err) {
                eventQueue.addAwaitingExternalEvent({
                  type: 'rntge/touch/callback',
                  payload: {
                    entityId: hitEntity,
                    name: 'onPanStart',
                    data: payload,
                  },
                  subscriptionId: '',
                });
              }
            }
          } else if (evtType === TouchEventTypes.Move) {
            const active = gestureState.activePointers.get(pointerId);
            if (active?.entityId === hitEntity && gestureComp?.onPanUpdate) {
              try {
                (gestureComp.onPanUpdate as any)(payload);
              } catch (err) {
                eventQueue.addAwaitingExternalEvent({
                  type: 'rntge/touch/callback',
                  payload: {
                    entityId: hitEntity,
                    name: 'onPanUpdate',
                    data: payload,
                  },
                  subscriptionId: '',
                });
              }
            }
          } else if (
            evtType === TouchEventTypes.End ||
            evtType === TouchEventTypes.Cancel
          ) {
            const active = gestureState.activePointers.get(pointerId);
            if (active?.entityId === hitEntity && gestureComp?.onPanEnd) {
              try {
                (gestureComp.onPanEnd as any)(payload);
              } catch (err) {
                eventQueue.addAwaitingExternalEvent({
                  type: 'rntge/touch/callback',
                  payload: {
                    entityId: hitEntity,
                    name: 'onPanEnd',
                    data: payload,
                  },
                  subscriptionId: '',
                });
              }
            }
            gestureState.activePointers.delete(pointerId);
          }
        } else if (
          gestureKind === GestureKinds.Tap &&
          evtType === TouchEventTypes.Tap &&
          gestureComp?.onTap
        ) {
          try {
            (gestureComp.onTap as any)(payload);
          } catch (err) {
            eventQueue.addAwaitingExternalEvent({
              type: 'rntge/touch/callback',
              payload: {
                entityId: hitEntity,
                name: 'onTap',
                data: payload,
              },
              subscriptionId: '',
            });
          }
        } else if (
          gestureKind === GestureKinds.LongPress &&
          evtType === TouchEventTypes.LongPress &&
          gestureComp?.onLongPress
        ) {
          try {
            (gestureComp.onLongPress as any)(payload);
          } catch (err) {
            eventQueue.addAwaitingExternalEvent({
              type: 'rntge/touch/callback',
              payload: {
                entityId: hitEntity,
                name: 'onLongPress',
                data: payload,
              },
              subscriptionId: '',
            });
          }
        }
      }
    } // end events loop
  },
};
