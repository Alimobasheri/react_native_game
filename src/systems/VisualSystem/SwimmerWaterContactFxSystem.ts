import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  createWorldYSortedRenderComponent,
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';
import {
  SwimmerAnticipationDentEventType,
  SwimmerDirectionalSplashEventType,
  SwimmerPivotSplashEventType,
  SwimmerWakeTrailEventType,
  type SwimmerAnticipationDentPayload,
  type SwimmerDirectionalSplashPayload,
  type SwimmerPivotSplashPayload,
  type SwimmerWakeTrailPayload,
} from '@/Game/characters/swimmerLocomotionEvents';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import {
  getGameSession,
  isStartReady,
} from '@/Game/session/gameSessionQuery';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';

type FxBurst = {
  entityId: number;
  age: number;
  maxAge: number;
  x: number;
  y: number;
  kind: 'splash' | 'pivot' | 'wake' | 'dent' | 'collar';
  direction: number;
  strength: number;
};

const FX_STORE_KEY = 'swimmerWaterFxBursts';

const getFxStore = (): FxBurst[] => {
  'worklet';
  const rntge = global._RNTGE_;
  if (!rntge) {
    return [];
  }
  if (!rntge[FX_STORE_KEY]) {
    rntge[FX_STORE_KEY] = [] as FxBurst[];
  }
  return rntge[FX_STORE_KEY] as FxBurst[];
};

const spawnBurst = (
  ecs: ECS,
  burst: Omit<FxBurst, 'entityId' | 'age'>
): void => {
  'worklet';
  const entityId = ecs.createEntity();
  const size = 8 + burst.strength * 14;
  const opacity = Math.min(0.85, 0.25 + burst.strength * 0.35);

  ecs.addComponent(
    entityId,
    createWorldYSortedRenderComponent({
      shape: {
        type: ShapeTypes.Circle,
        radius: size,
      },
      position: { x: burst.x, y: burst.y },
      visible: true,
      renderLayer: SwimmerRenderLayer.WaterSurfaceFoam,
      opacity,
      fillColor: burst.kind === 'pivot' ? '#D8F4FF' : '#B8E8FF',
    })
  );

  const store = getFxStore();
  store.push({
    entityId,
    age: 0,
    maxAge: burst.maxAge,
    x: burst.x,
    y: burst.y,
    kind: burst.kind,
    direction: burst.direction,
    strength: burst.strength,
  });
};

const handleSplashPayload = (
  ecs: ECS,
  payload: SwimmerDirectionalSplashPayload | SwimmerPivotSplashPayload,
  kind: 'splash' | 'pivot',
  direction: number,
  strength: number
): void => {
  'worklet';
  const offsetX = kind === 'splash' ? -direction * 12 : 0;
  spawnBurst(ecs, {
    maxAge: kind === 'pivot' ? 0.45 : 0.28,
    x: payload.x + offsetX,
    y: payload.y + 6,
    kind,
    direction,
    strength,
  });
};

/**
 * Lightweight water-contact FX — foam collar, directional splashes, wake streaks.
 * Placeholder circles; replace with art/particles when assets land.
 */
export const SwimmerWaterContactFxSystem: System = {
  name: 'SwimmerWaterContactFxSystem',
  requiredComponents: [SwimmerComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue }) => {
    'worklet';

    const deltaSeconds = deltaTime / 1000;
    const events = eventQueue.readEvents();
    const session = getGameSession(components);
    const startReady = isStartReady(session);

    for (let e = 0; e < events.length; e++) {
      const event = events[e];
      if (event.type === SwimmerDirectionalSplashEventType) {
        const payload = event.payload as SwimmerDirectionalSplashPayload;
        const strength = Math.min(1.2, 0.35 + payload.tier * 0.22);
        handleSplashPayload(
          ecs,
          payload,
          'splash',
          payload.direction,
          strength
        );
      } else if (event.type === SwimmerPivotSplashEventType) {
        const payload = event.payload as SwimmerPivotSplashPayload;
        const strength = Math.min(1.5, payload.impactSpeed / 280);
        handleSplashPayload(ecs, payload, 'pivot', 0, strength);
      } else if (event.type === SwimmerAnticipationDentEventType) {
        const payload = event.payload as SwimmerAnticipationDentPayload;
        spawnBurst(ecs, {
          maxAge: 0.18,
          x: payload.x - payload.direction * 6,
          y: payload.y + 10,
          kind: 'dent',
          direction: payload.direction,
          strength: 0.35,
        });
      } else if (event.type === SwimmerWakeTrailEventType) {
        const payload = event.payload as SwimmerWakeTrailPayload;
        const strength = Math.min(1, Math.abs(payload.velocityX) / 400);
        spawnBurst(ecs, {
          maxAge: 0.22,
          x: payload.x - Math.sign(payload.velocityX) * 18,
          y: payload.y + 4,
          kind: 'wake',
          direction: Math.sign(payload.velocityX),
          strength,
        });
      }
    }

    const swimmerStore = components[SwimmerComponentName];
    if (!swimmerStore) {
      return;
    }

    for (let i = 0; i < entities.length; i++) {
      const swimmer = swimmerStore.get(entities[i]) as
        | SwimmerComponentData
        | undefined;
      if (!swimmer) {
        continue;
      }

      const locomotion = swimmer.locomotion;
      const showCollar = startReady || !swimmer.isInInitialPhase;
      if (showCollar && (locomotion.foamCollarEntityId ?? 0) === 0) {
        const collarId = ecs.createEntity();
        ecs.addComponent(
          collarId,
          createWorldYSortedRenderComponent({
            shape: { type: ShapeTypes.Circle, radius: 10 },
            position: { x: swimmer.x, y: swimmer.y + 8 },
            visible: true,
            renderLayer: SwimmerRenderLayer.WaterSurfaceFoam,
            opacity: startReady ? 0.55 : 0.4,
            fillColor: '#E8FAFF',
          })
        );
        locomotion.foamCollarEntityId = collarId;
      }

      const collarEntityId = locomotion.foamCollarEntityId;
      if (typeof collarEntityId === 'number') {
        const collarRender = components[RenderComponentName]?.get(
          collarEntityId
        ) as RenderComponentData | undefined;
        if (collarRender) {
          const bob = startReady
            ? Math.sin((swimmer.bobbingPhase ?? 0) * 0.9) * 2
            : 0;
          collarRender.position = { x: swimmer.x, y: swimmer.y + 8 + bob };
          collarRender.visible = showCollar;
          collarRender.isDirty = true;
        }
      }

      if (
        !startReady &&
        locomotion.visualPhase === VisualStrokePhase.GLIDE &&
        Math.abs(swimmer.velocityX) >= swimmerVisualTuning.WAKE_MIN_SPEED
      ) {
        locomotion.wakeSpawnTimer =
          (locomotion.wakeSpawnTimer ?? 0) + deltaSeconds;
        if (
          locomotion.wakeSpawnTimer >=
          swimmerVisualTuning.WAKE_SPAWN_INTERVAL_SEC
        ) {
          locomotion.wakeSpawnTimer = 0;
          eventQueue.addEvent({
            type: SwimmerWakeTrailEventType,
            payload: {
              entityId: entities[i],
              x: swimmer.x,
              y: swimmer.y,
              velocityX: swimmer.velocityX,
              tier: locomotion.currentTier,
            },
          });
        }
      }
    }

    const store = getFxStore();
    for (let i = store.length - 1; i >= 0; i--) {
      const burst = store[i];
      burst.age += deltaSeconds;
      const render = components[RenderComponentName]?.get(
        burst.entityId
      ) as RenderComponentData | undefined;
      if (render) {
        const life = 1 - burst.age / burst.maxAge;
        render.opacity = Math.max(0, life * (0.25 + burst.strength * 0.35));
        render.isDirty = true;
        if (burst.kind === 'wake') {
          render.position = {
            x: burst.x + burst.direction * burst.age * 40,
            y: burst.y,
          };
        }
      }
      if (burst.age >= burst.maxAge) {
        ecs.removeEntity(burst.entityId);
        store.splice(i, 1);
      }
    }
  },
};
