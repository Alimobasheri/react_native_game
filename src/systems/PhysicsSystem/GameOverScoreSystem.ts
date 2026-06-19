import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  GameOverScoreComponentName,
} from '@/Game/ecs-components/GameOverScore';
import {
  RunResultComponentName,
  RunResultComponentData,
} from '@/Game/ecs-components/RunResult';
import {
  TextComponentName,
  TextComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

/**
 * Syncs the game-over score label with the persisted final run score.
 */
export const GameOverScoreSystem: System = {
  requiredComponents: [GameOverScoreComponentName, TextComponentName],
  process: ({ entities, components, ecs }) => {
    'worklet';

    const runResultData = firstDataFromStore(
      components[RunResultComponentName]
    ) as RunResultComponentData | undefined;
    if (!runResultData) return;

    const displayScore = Math.floor(runResultData.finalScore);
    const newText = String(displayScore);

    for (let i = 0; i < entities.length; i++) {
      const entityId = entities[i];
      const textData = components[TextComponentName].get(entityId) as
        | TextComponentData
        | undefined;
      if (!textData || textData.text === newText) continue;

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
  },
};
