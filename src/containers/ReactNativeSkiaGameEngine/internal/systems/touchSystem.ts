import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentName,
  RenderComponentData,
  ShapeTypes,
} from '../components/render';
import { MatterBodyComponentName } from '../components/matterBody';
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
  TouchInputEventPayload,
  TouchGestureCallbackData,
  TapGesturePayload,
  LongPressGesturePayload,
  PanGesturePayload,
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
  // Render positions (and Matter body positions) are center-based in this engine.
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
  process: (systemArgs) => {
    'worklet';

    const { entities, components, eventQueue, ecs } = systemArgs;

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
      const ev = events[evIndex].payload as TouchInputEventPayload;

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
      let componentName: string | null = null;
      let tapComponents;
      let gestureEntities: number[];
      let gestureState: any;

      switch (gestureKind) {
        case GestureKinds.Pan:
          componentName = PanComponentName;

          gestureEntities = ecs.getEntitiesWithComponents([
            RenderComponentName,
            PanComponentName,
          ]);
          gestureState = state.pan;
          break;
        case GestureKinds.Tap:
          componentName = TapComponentName;
          gestureEntities = ecs.getEntitiesWithComponents([
            RenderComponentName,
            TapComponentName,
          ]);
          gestureState = state.tap;
          break;
        case GestureKinds.LongPress:
          componentName = LongPressComponentName;
          gestureEntities = ecs.getEntitiesWithComponents([
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

          const body = components[MatterBodyComponentName]?.get(ent);
          const pos = body?.position || renderData.position || { x: 0, y: 0 };
          const gestureComp = components[componentName]?.get(ent);
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
          if (![null, undefined].includes(active?.entityId) && componentName) {
            const gestureComp = components[componentName]?.get(
              active.entityId
            ) as any;
            if (gestureComp?.checkBoundsOnUpdate) {
              hitEntity = findHitEntity();
              if (hitEntity !== active.entityId) {
                hitEntity = null;
                (gestureState.activePointers as Map<number, any>).delete(
                  pointerId
                );
              }
            } else {
              hitEntity = active.entityId;
            }
          }
        }
      } else {
        hitEntity = findHitEntity();
      }
      if (hitEntity === null) return;
      if (hitEntity !== null) {
        let payload = {
          entityId: hitEntity,
          pointerId,
          x: px,
          y: py,
          timestamp: ev.timestamp,
          raw: ev.meta,
          type: gestureState,
          systemArgs,
        };

        if (gestureKind === GestureKinds.Pan) {
          const gestureComp: PanComponentData =
            components[componentName]?.get(hitEntity);

          if (evtType === TouchEventTypes.Start) {
            gestureState.activePointers.set(pointerId, {
              entityId: hitEntity,
              captured: !!gestureComp?.capture,
            });
            if (gestureComp?.onPanStart) {
              let panPayload: TouchGestureCallbackData<PanGesturePayload> = {
                ...payload,
                gesture: ev.gesture,
              };
              try {
                gestureComp.onPanStart(panPayload);
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
                let panPayload: TouchGestureCallbackData<PanGesturePayload> = {
                  ...payload,
                  gesture: ev.gesture,
                };
                gestureComp.onPanUpdate(panPayload);
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
                let panPayload: TouchGestureCallbackData<PanGesturePayload> = {
                  ...payload,
                  gesture: ev.gesture,
                };
                gestureComp.onPanEnd(panPayload);
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
          evtType === TouchEventTypes.Tap
        ) {
          const gestureComp = components[TapComponentName].get(
            hitEntity
          ) as TapComponentData;
          if (gestureComp?.onTap) {
            try {
              let tapPayload: TouchGestureCallbackData<TapGesturePayload> = {
                ...payload,
                gesture: ev.gesture,
              };
              gestureComp.onTap(tapPayload);
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
          }
        } else if (
          gestureKind === GestureKinds.LongPress &&
          evtType === TouchEventTypes.LongPress
        ) {
          const gestureComp = components[LongPressComponentName].get(
            hitEntity
          ) as LongPressComponentData;
          if (gestureComp?.onLongPress) {
            try {
              let longPressPayload: TouchGestureCallbackData<LongPressGesturePayload> =
              {
                ...payload,
                gesture: ev.gesture,
              };
              gestureComp.onLongPress(longPressPayload);
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
      }
    } // end events loop
  },
};
