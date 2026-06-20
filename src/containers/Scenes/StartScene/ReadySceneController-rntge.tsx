import { useAddEntity, useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { createGameSessionComponent } from '@/Game/ecs-components/GameSession';
import { loadBestScore } from '@/Game/persistence/bestScoreStorage';
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
  const visualRaisingSpeed = gameplayRaisingSpeed * 0.2;

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
      }),
    ],
    [
      gameTitle,
      shopEnabled,
      gameplayRaisingSpeed,
      visualRaisingSpeed,
      bestScore,
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
