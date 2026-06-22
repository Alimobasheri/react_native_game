import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { firstEntityFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import { ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import {
  ObstaclesManagerComponentData,
  ObstaclesManagerComponentName,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  ScoreComponentData,
  ScoreComponentName,
  type ScoreHudAnimState,
} from '@/Game/ecs-components/Score';
import {
  RunResultComponentData,
  RunResultComponentName,
} from '@/Game/ecs-components/RunResult';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';
import {
  TemplateContextComponentData,
  TemplateContextComponentName,
} from '@/Game/ecs-components/TemplateContextComponent';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import { getWaterSurfaceRestY, LAYOUT_CONSTANTS } from '@/Layout';
import { RestartGameplayRequestType } from '@/Game/session/restartGameplayEvents';

const SWIMMER_START_ABOVE_SURFACE_PX = 10;
const REMOVE_ENTITY_BATCH_REQUEST = 'RemoveEntityBatchRequest';

const defaultScoreHudAnimState = (): ScoreHudAnimState => {
  'worklet';
  return {
    displayedInteger: 0,
    lastInteger: 0,
    entranceStartMs: 0,
    popStartMs: 0,
    milestonePopStartMs: 0,
    newBestStartMs: 0,
    beatBestShown: false,
    lastMilestone: 0,
  };
};

const restartGameplay = (
  ecs: ECS,
  sessionEntity: Entity,
  eventQueue: { addEvent: (event: { type: string; payload: object }) => void },
  sceneKey = 'game'
): void => {
  'worklet';

  const components = ecs.components;
  const nowMs = Date.now();
  const session = components[GameSessionComponentName]?.get(
    sessionEntity
  ) as GameSessionComponentData | undefined;
  if (!session) return;

  const rowStore = components[ObstacleRowComponentName];
  if (rowStore) {
    const entityIds: Entity[] = [];
    rowStore.forEach((entityId) => {
      entityIds.push(entityId);
    });
    if (entityIds.length > 0) {
      eventQueue.addEvent({
        type: REMOVE_ENTITY_BATCH_REQUEST,
        payload: { entityIds, sceneKey },
      });
    }
  }

  const managerEntities = ecs.getEntitiesWithComponents([
    ObstaclesManagerComponentName,
  ]);
  if (managerEntities.length > 0) {
    ecs.updateComponent<ObstaclesManagerComponentData>(
      managerEntities[0],
      ObstaclesManagerComponentName,
      (m) => {
        m.spawnTimerSeconds = 0;
        m.totalRowsGenerated = 0;
        m.templateInfo = undefined;
        m.lastObstacleRowGenLogKey = undefined;
        m.lastPlayerDiagCenterRowEntity = null;
      }
    );
  }

  const templateEntities = ecs.getEntitiesWithComponents([
    TemplateContextComponentName,
  ]);
  for (let i = 0; i < templateEntities.length; i++) {
    ecs.updateComponent<TemplateContextComponentData>(
      templateEntities[i],
      TemplateContextComponentName,
      (tc) => {
        tc.templateName = '';
        tc.ctx = {};
        tc.runId = Math.floor(Math.random() * 1_000_000_000);
      }
    );
  }

  const containerEntity = firstEntityFromStore(components[ContainerComponentName]);
  if (typeof containerEntity === 'number') {
    const container = components[ContainerComponentName].get(
      containerEntity
    ) as ContainerComponentData;
    const restY = getWaterSurfaceRestY(container.centerY, container.height);
    const swimmerStartY = restY - SWIMMER_START_ABOVE_SURFACE_PX;

    ecs.updateComponent<ContainerComponentData>(
      containerEntity,
      ContainerComponentName,
      (c) => {
        c.waterSurfaceY = restY;
      }
    );

    const columnWidth = container.width / LAYOUT_CONSTANTS.COLUMNS;
    const swimmerEntities = ecs.getEntitiesWithComponents([SwimmerComponentName]);
    for (let i = 0; i < swimmerEntities.length; i++) {
      const swimmerEntity = swimmerEntities[i];
      const swimmer = components[SwimmerComponentName].get(
        swimmerEntity
      ) as SwimmerComponentData | undefined;
      if (!swimmer) continue;

      const column = swimmer.column ?? Math.floor(LAYOUT_CONSTANTS.COLUMNS / 2);
      const centerX =
        container.centerX -
        container.width / 2 +
        columnWidth * column +
        columnWidth / 2;

      ecs.updateComponent<SwimmerComponentData>(
        swimmerEntity,
        SwimmerComponentName,
        (s) => {
          s.x = centerX;
          s.y = swimmerStartY;
          s.velocityX = 0;
          s.inputX = 0;
          s.lastTapTimeMs = undefined;
          s.lastTapDirection = undefined;
          s.rapidTapStreak = 0;
          s.pendingTapMultiplier = 1;
          s.waterSurfaceY = restY;
          s.isInInitialPhase = false;
          s.isCollidingWithObstacle = false;
          s.isPinnedFromAbove = false;
          s.fallingVelocityY = 0;
          s.gameOverDispatched = false;
          s.angle = 0;
          s.bobbingPhase = 0;
        }
      );

      ecs.updateComponent<RenderComponentData>(
        swimmerEntity,
        RenderComponentName,
        (render) => {
          render.position = { x: centerX, y: swimmerStartY };
          render.angle = 0;
          render.isDirty = true;
        }
      );
    }

    const waterEntity = firstEntityFromStore(components[WaterComponentName]);
    if (typeof waterEntity === 'number') {
      ecs.updateComponent<WaterComponentData>(
        waterEntity,
        WaterComponentName,
        (w) => {
          w.raisingSpeed = session.visualRaisingSpeed;
          w.baseSpeed = session.gameplayRaisingSpeed;
          w.centerRowEntity = undefined;
          w.lastCenterRowEntity = undefined;
          w.visualIntensity = 1;
          w.gapBlend = 0;
          w.surgePhase = 0;
          w.surgeEnergy = 0;
          w.flowVelocity = 0;
          w.flowOffset = 0;
        }
      );
    }
  }

  const scoreEntities = ecs.getEntitiesWithComponents([ScoreComponentName]);
  for (let i = 0; i < scoreEntities.length; i++) {
    ecs.updateComponent<ScoreComponentData>(
      scoreEntities[i],
      ScoreComponentName,
      (s) => {
        s.score = 0;
        s.accumulatedTime = 0;
        s.hud = defaultScoreHudAnimState();
      }
    );
  }

  const runEntities = ecs.getEntitiesWithComponents([RunResultComponentName]);
  if (runEntities.length > 0) {
    ecs.updateComponent<RunResultComponentData>(
      runEntities[0],
      RunResultComponentName,
      (r) => {
        r.finalScore = 0;
      }
    );
  }

  ecs.updateComponent<GameSessionComponentData>(
    sessionEntity,
    GameSessionComponentName,
    (s) => {
      s.phase = 'playing';
      s.gameOverOverlayIntroStartMs = 0;
      s.gameOverOverlayFadeStartMs = 0;
      s.gameOverRetryPressStartMs = 0;
      s.gameOverScoreAnimStartMs = 0;
      s.gameOverFinalScore = 0;
      s.gameOverIsNewBest = false;
      s.speedRampStartMs = nowMs;
      s.tutorialFadeStartMs = 0;
      s.animTimeSec = 0;
      s.ctaPressStartMs = 0;
    }
  );
};

export const RestartGameplaySystem: System = {
  name: 'restartGameplaySystem',
  requiredEvents: [RestartGameplayRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === RestartGameplayRequestType);

    for (let i = 0; i < events.length; i++) {
      const payload = events[i].payload as {
        sessionEntity?: number;
        sceneKey?: string;
      };
      if (typeof payload.sessionEntity !== 'number') continue;
      restartGameplay(
        ecs,
        payload.sessionEntity,
        eventQueue,
        payload.sceneKey ?? 'game'
      );
    }
  },
};
