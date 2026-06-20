import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  ScoreComponentName,
  ScoreComponentData,
} from '@/Game/ecs-components/Score';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { SwimmerComponentName, SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import { TextComponentName, TextComponentData } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { RenderComponentData, RenderComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { getGameSession, isStartReady } from '@/Game/session/gameSessionQuery';

/** Score tick interval in ms. */
const SCORE_TICK_MS = 30;
/** Divide (speed * time) by this to get reasonable score increments. */
const SCORE_DIVISOR = 80;

/**
 * ScoreSystem - Updates score based on water speed and time (distance).
 * Only runs after initial water rising phase. Updates score every 30ms and
 * syncs the entity's Text component to display the current score.
 */
export const ScoreSystem: System = {
  requiredComponents: [ScoreComponentName, TextComponentName],
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
      const textData = components[TextComponentName].get(entityId) as
        | TextComponentData
        | undefined;
      if (!scoreData || !textData) continue;

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

      const displayScore = Math.floor(scoreData.score);
      const newText = String(displayScore);
      if (textData.text !== newText) {
        ecs.updateComponent<TextComponentData>(
          entityId,
          TextComponentName,
          (t) => {
            t.text = newText;
            t.isDirty = true;
          }
        );
        ecs.updateComponent<RenderComponentData>(
          entityId,
          RenderComponentName,
          (r) => {
            r.isDirty = true;
          }
        );
      }
    }
  },
};
