import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const GameOverOverlayTagComponentName = 'GameOverOverlayTag';

export type GameOverOverlayRole =
  | 'dim'
  | 'panel'
  | 'title'
  | 'subtitle'
  | 'statsDivider'
  | 'scoreLabel'
  | 'scoreValue'
  | 'bestLabel'
  | 'bestValue'
  | 'newBestTag'
  | 'retryButton'
  | 'retryIcon'
  | 'retryLabel'
  | 'reviveButton'
  | 'reviveIcon'
  | 'reviveTitle'
  | 'reviveSubtitle';

export type GameOverOverlayTagComponentData = {
  role: GameOverOverlayRole;
  baseX: number;
  baseY: number;
  baseWidth: number;
  baseHeight: number;
  /** Images / panel rects use center anchor; text uses top-left. */
  centerAnchored?: boolean;
};

export const createGameOverOverlayTagComponent = (
  data: GameOverOverlayTagComponentData
): Component<GameOverOverlayTagComponentData> => {
  'worklet';
  return {
    name: GameOverOverlayTagComponentName,
    data,
  };
};
