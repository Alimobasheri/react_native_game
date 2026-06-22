import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  ScoreComponentName,
  ScoreComponentData,
} from '@/Game/ecs-components/Score';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { SwimmerComponentName, SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import { getGameSession, isStartReady } from '@/Game/session/gameSessionQuery';

/** Score tick interval in ms. */
const SCORE_TICK_MS = 30;
/** Divide (speed * time) by this to get reasonable score increments. */
const SCORE_DIVISOR = 80;

/**
 * ScoreSystem - Updates internal score based on water speed and time (distance).
 * Display and HUD animation are handled by ScoreHudSystem.
 */
export const ScoreSystem: System = {
  requiredComponents: [ScoreComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    const waterData = firstDataFromStore(components[WaterComponentName]);
    if (!waterData) return;

    const swimmerData = firstDataFromStore(components[SwimmerComponentName]) as
      | SwimmerComponentData
      | undefined;
    const isInInitialPhase = swimmerData?.isInInitialPhase ?? true;
    const session = getGameSession(components);

    if (isInInitialPhase || isStartReady(session)) return;

    const raisingSpeed = waterData.raisingSpeed ?? 0;

    for (let i = 0; i < entities.length; i++) {
      const entityId = entities[i];
      const scoreData = components[ScoreComponentName].get(entityId) as
        | ScoreComponentData
        | undefined;
      if (!scoreData) continue;

      let accumulated = scoreData.accumulatedTime + deltaTime;

      while (accumulated >= SCORE_TICK_MS) {
        const added =
          (raisingSpeed * (SCORE_TICK_MS / 1000)) / SCORE_DIVISOR;
        scoreData.score += added;
        accumulated -= SCORE_TICK_MS;
      }

      ecs.updateComponent<ScoreComponentData>(
        entityId,
        ScoreComponentName,
        (s) => {
          s.score = scoreData.score;
          s.accumulatedTime = accumulated;
        }
      );
    }
  },
};
