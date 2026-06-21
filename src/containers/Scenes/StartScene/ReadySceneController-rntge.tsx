import { useAddEntity, useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { createGameSessionComponent } from '@/Game/ecs-components/GameSession';
import { loadBestScore } from '@/Game/persistence/bestScoreStorage';
import { gameSessionTuning } from '@/config/swimmerTuning';
import { StartScreenSystem } from '@/systems/StartScreenSystem';
import type { SafeAreaInsets } from '@/Game/ui/refLayout';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';

export type ReadySceneControllerProps = {
  gameTitle: string;
  shopEnabled: boolean;
  gameplayRaisingSpeed: number;
  safeAreaInsets: SafeAreaInsets;
  children?: ReactNode;
};

const GameSessionEntity: FC<
  ReadySceneControllerProps & { bestScore: number; children?: ReactNode }
> = ({
  gameTitle,
  shopEnabled,
  gameplayRaisingSpeed,
  bestScore,
  children,
}) => {
  const visualRaisingSpeed =
    gameplayRaisingSpeed * gameSessionTuning.VISUAL_RAISING_SPEED_RATIO;

  const overlayIntroStartMs = useMemo(() => Date.now(), []);

  const components = useMemo(
    () => [
      createGameSessionComponent({
        gameTitle,
        shopEnabled,
        gameplayRaisingSpeed,
        visualRaisingSpeed,
        bestScore,
        phase: 'start_ready',
        overlayOpacity: 1,
        overlayIntroStartMs,
      }),
    ],
    [
      gameTitle,
      shopEnabled,
      gameplayRaisingSpeed,
      visualRaisingSpeed,
      bestScore,
      overlayIntroStartMs,
    ]
  );

  useAddEntity({ components });
  useAddSystem({ system: StartScreenSystem });

  return <>{children}</>;
};

export const ReadySceneController: FC<ReadySceneControllerProps> = ({
  children,
  ...props
}) => {
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadBestScore().then((score) => {
      if (!cancelled) setBestScore(score);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GameSessionEntity {...props} bestScore={bestScore}>
      {children}
    </GameSessionEntity>
  );
};
