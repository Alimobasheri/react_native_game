import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { GameOverScreenSystem } from '@/systems/GameOverScreenSystem';
import { RestartGameplaySystem } from '@/systems/RestartGameplaySystem';
import { FC, ReactNode } from 'react';

export type GameOverOverlayControllerProps = {
  children?: ReactNode;
};

export const GameOverOverlayController: FC<GameOverOverlayControllerProps> = ({
  children,
}) => {
  useAddSystem({ system: GameOverScreenSystem });
  useAddSystem({ system: RestartGameplaySystem });
  return <>{children}</>;
};
