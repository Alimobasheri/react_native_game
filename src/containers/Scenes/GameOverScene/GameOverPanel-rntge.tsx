import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { createGameOverOverlayTagComponent } from '@/Game/ecs-components/GameOverOverlayTag';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import { getGameSessionEntity } from '@/Game/session/gameSessionQuery';
import { RestartGameplayRequestType } from '@/Game/session/restartGameplayEvents';
import { GAME_OVER_PANEL_COLORS } from '@/Game/ui/gameOverPanelVisuals';
import { SWIMMER_UI_IMAGE } from '@/assets/swimmerUi';
import type { SafeAreaInsets } from '@/Game/ui/refLayout';
import { COLOR_CAVE_DEEP, COLOR_TEXT_WHITE } from '@/Game/ui/swimmerTheme';
import {
  GAME_OVER_NEW_BEST_COLOR,
  GAME_OVER_SCORE_COLOR,
  GAME_OVER_SUBTITLE_COLOR,
  GAME_OVER_TITLE_COLOR,
  GAME_OVER_TITLE_STROKE,
} from '@/systems/GameOverScreenSystem';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';
import {
  GAME_OVER_OVERLAY_Z,
  layoutGameOverOverlay,
  rectCenter,
  textPosition,
} from './gameOverOverlayLayout';

function useGameOverLayout(
  screenW: number,
  screenH: number,
  insets: SafeAreaInsets
) {
  return useMemo(
    () => layoutGameOverOverlay(screenW, screenH, insets),
    [screenW, screenH, insets]
  );
}

export const GameOverPanel: FC<{ insets: SafeAreaInsets }> = ({ insets }) => {
  const dimensions = useCanvasDimensions();
  const layout = useGameOverLayout(
    dimensions.width,
    dimensions.height,
    insets
  );

  const panelComponents = useMemo(() => {
    const { panel, borderRadius } = layout;
    return [
      createGameOverOverlayTagComponent({
        role: 'panel',
        baseX: panel.x,
        baseY: panel.y,
        baseWidth: panel.width,
        baseHeight: panel.height,
        centerAnchored: true,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: panel.width,
          height: panel.height,
          borderRadius,
        },
        position: rectCenter(panel),
        fillColor: GAME_OVER_PANEL_COLORS.fill,
        strokeColor: GAME_OVER_PANEL_COLORS.border,
        lineWidth: 3,
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.panel,
      }),
    ];
  }, [layout]);

  const titleComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'title',
        baseX: layout.title.x,
        baseY: layout.title.y,
        baseWidth: layout.title.width,
        baseHeight: layout.title.height,
      }),
      createTextComponent({
        text: 'GAME OVER',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.title,
        color: GAME_OVER_TITLE_COLOR,
        strokeColor: GAME_OVER_TITLE_STROKE,
        strokeWidth: 4,
        align: TextAlign.Center,
        maxWidth: layout.title.width,
        zIndex: GAME_OVER_OVERLAY_Z.content,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.title.width,
          height: layout.title.height,
        },
        position: textPosition(layout.title),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.content,
      }),
    ],
    [layout]
  );

  const subtitleComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'subtitle',
        baseX: layout.subtitle.x,
        baseY: layout.subtitle.y,
        baseWidth: layout.subtitle.width,
        baseHeight: layout.subtitle.height,
      }),
      createTextComponent({
        text: 'You got squished',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.subtitle,
        color: GAME_OVER_SUBTITLE_COLOR,
        align: TextAlign.Center,
        maxWidth: layout.subtitle.width,
        zIndex: GAME_OVER_OVERLAY_Z.content,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.subtitle.width,
          height: layout.subtitle.height,
        },
        position: textPosition(layout.subtitle),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.content,
      }),
    ],
    [layout]
  );

  const dividerComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'statsDivider',
        baseX: layout.statsDivider.x,
        baseY: layout.statsDivider.y,
        baseWidth: layout.statsDivider.width,
        baseHeight: layout.statsDivider.height,
        centerAnchored: true,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.statsDivider.width,
          height: layout.statsDivider.height,
          borderRadius: 2,
        },
        position: rectCenter(layout.statsDivider),
        fillColor: GAME_OVER_PANEL_COLORS.divider,
        opacity: 0.65,
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.stats,
      }),
    ],
    [layout]
  );

  const scoreLabelComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'scoreLabel',
        baseX: layout.scoreLabel.x,
        baseY: layout.scoreLabel.y,
        baseWidth: layout.scoreLabel.width,
        baseHeight: layout.scoreLabel.height,
      }),
      createTextComponent({
        text: 'SCORE',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.label,
        color: Skia.Color(GAME_OVER_PANEL_COLORS.label),
        align: TextAlign.Center,
        maxWidth: layout.scoreLabel.width,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.scoreLabel.width,
          height: layout.scoreLabel.height,
        },
        position: textPosition(layout.scoreLabel),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
    ],
    [layout]
  );

  const scoreValueComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'scoreValue',
        baseX: layout.scoreValue.x,
        baseY: layout.scoreValue.y,
        baseWidth: layout.scoreValue.width,
        baseHeight: layout.scoreValue.height,
      }),
      createTextComponent({
        text: '0',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.value,
        color: GAME_OVER_SCORE_COLOR,
        align: TextAlign.Center,
        maxWidth: layout.scoreValue.width,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.scoreValue.width,
          height: layout.scoreValue.height,
        },
        position: textPosition(layout.scoreValue),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
    ],
    [layout]
  );

  const bestLabelComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'bestLabel',
        baseX: layout.bestLabel.x,
        baseY: layout.bestLabel.y,
        baseWidth: layout.bestLabel.width,
        baseHeight: layout.bestLabel.height,
      }),
      createTextComponent({
        text: 'BEST',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.label,
        color: Skia.Color(GAME_OVER_PANEL_COLORS.labelBest),
        align: TextAlign.Center,
        maxWidth: layout.bestLabel.width,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.bestLabel.width,
          height: layout.bestLabel.height,
        },
        position: textPosition(layout.bestLabel),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
    ],
    [layout]
  );

  const bestValueComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'bestValue',
        baseX: layout.bestValue.x,
        baseY: layout.bestValue.y,
        baseWidth: layout.bestValue.width,
        baseHeight: layout.bestValue.height,
      }),
      createTextComponent({
        text: '0',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.value,
        color: GAME_OVER_SCORE_COLOR,
        align: TextAlign.Center,
        maxWidth: layout.bestValue.width,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.bestValue.width,
          height: layout.bestValue.height,
        },
        position: textPosition(layout.bestValue),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 1,
      }),
    ],
    [layout]
  );

  const newBestComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'newBestTag',
        baseX: layout.newBestTag.x,
        baseY: layout.newBestTag.y,
        baseWidth: layout.newBestTag.width,
        baseHeight: layout.newBestTag.height,
      }),
      createTextComponent({
        text: 'NEW BEST!',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.newBest,
        color: GAME_OVER_NEW_BEST_COLOR,
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 2,
        align: TextAlign.Center,
        maxWidth: layout.newBestTag.width,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 2,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.newBestTag.width,
          height: layout.newBestTag.height,
        },
        position: textPosition(layout.newBestTag),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.stats + 2,
      }),
    ],
    [layout]
  );

  const retryButtonComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'retryButton',
        baseX: layout.retry.x,
        baseY: layout.retry.y,
        baseWidth: layout.retry.width,
        baseHeight: layout.retry.height,
        centerAnchored: true,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.retry.width,
          height: layout.retry.height,
        },
        position: rectCenter(layout.retry),
        image: SWIMMER_UI_IMAGE.uiBtnBlue,
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.retry,
      }),
      createTapComponent({
        priority: GAME_OVER_OVERLAY_Z.retry,
        capture: true,
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.retry.width,
          height: layout.retry.height,
        },
        onTap: ({ systemArgs }) => {
          'worklet';
          const { ecs, eventQueue } = systemArgs;
          const sessionEntity = getGameSessionEntity(ecs.components);
          if (typeof sessionEntity !== 'number') return;
          const session = ecs.components[GameSessionComponentName]?.get(
            sessionEntity
          ) as GameSessionComponentData | undefined;
          if (!session || session.phase !== 'game_over') return;

          ecs.updateComponent<GameSessionComponentData>(
            sessionEntity,
            GameSessionComponentName,
            (s) => {
              s.gameOverRetryPressStartMs = Date.now();
              s.gameOverOverlayFadeStartMs = Date.now();
            }
          );
          eventQueue.addEvent({
            type: RestartGameplayRequestType,
            payload: { sessionEntity, sceneKey: 'game' },
          });
        },
      }),
    ],
    [layout]
  );

  const retryLabelComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'retryLabel',
        baseX: layout.retryLabel.x,
        baseY: layout.retryLabel.y,
        baseWidth: layout.retryLabel.width,
        baseHeight: layout.retryLabel.height,
      }),
      createTextComponent({
        text: 'RETRY',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.retry,
        color: Skia.Color(COLOR_TEXT_WHITE),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 3,
        align: TextAlign.Left,
        maxWidth: layout.retryLabel.width,
        zIndex: GAME_OVER_OVERLAY_Z.retry + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.retryLabel.width,
          height: layout.retryLabel.height,
        },
        position: textPosition(layout.retryLabel),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.retry + 1,
      }),
    ],
    [layout]
  );

  const retryIconComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'retryIcon',
        baseX: layout.retryIcon.x,
        baseY: layout.retryIcon.y,
        baseWidth: layout.retryIcon.width,
        baseHeight: layout.retryIcon.height,
        centerAnchored: true,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.retryIcon.width,
          height: layout.retryIcon.height,
        },
        position: rectCenter(layout.retryIcon),
        image: SWIMMER_UI_IMAGE.retryIcon,
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.retry + 1,
      }),
    ],
    [layout]
  );

  const reviveButtonComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'reviveButton',
        baseX: layout.revive.x,
        baseY: layout.revive.y,
        baseWidth: layout.revive.width,
        baseHeight: layout.revive.height,
        centerAnchored: true,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.revive.width,
          height: layout.revive.height,
        },
        position: rectCenter(layout.revive),
        image: SWIMMER_UI_IMAGE.uiBtnGolden,
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.revive,
      }),
      createTapComponent({
        priority: GAME_OVER_OVERLAY_Z.revive,
        capture: true,
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.revive.width,
          height: layout.revive.height,
        },
        onTap: () => {
          'worklet';
          // Revive flow (watch ad) wired in a follow-up.
        },
      }),
    ],
    [layout]
  );

  const reviveTitleComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'reviveTitle',
        baseX: layout.reviveTitle.x,
        baseY: layout.reviveTitle.y,
        baseWidth: layout.reviveTitle.width,
        baseHeight: layout.reviveTitle.height,
      }),
      createTextComponent({
        text: 'REVIVE x1',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.reviveTitle,
        color: Skia.Color(COLOR_CAVE_DEEP),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 1,
        align: TextAlign.Left,
        maxWidth: layout.reviveTitle.width,
        zIndex: GAME_OVER_OVERLAY_Z.revive + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.reviveTitle.width,
          height: layout.reviveTitle.height,
        },
        position: textPosition(layout.reviveTitle),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.revive + 1,
      }),
    ],
    [layout]
  );

  const reviveSubtitleComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'reviveSubtitle',
        baseX: layout.reviveSubtitle.x,
        baseY: layout.reviveSubtitle.y,
        baseWidth: layout.reviveSubtitle.width,
        baseHeight: layout.reviveSubtitle.height,
      }),
      createTextComponent({
        text: 'WATCH AD TO REVIVE',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.reviveSubtitle,
        color: Skia.Color(COLOR_CAVE_DEEP),
        align: TextAlign.Left,
        maxWidth: layout.reviveSubtitle.width,
        opacity: 0.85,
        zIndex: GAME_OVER_OVERLAY_Z.revive + 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.reviveSubtitle.width,
          height: layout.reviveSubtitle.height,
        },
        position: textPosition(layout.reviveSubtitle),
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.revive + 1,
      }),
    ],
    [layout]
  );

  const reviveIconComponents = useMemo(
    () => [
      createGameOverOverlayTagComponent({
        role: 'reviveIcon',
        baseX: layout.reviveIcon.x,
        baseY: layout.reviveIcon.y,
        baseWidth: layout.reviveIcon.width,
        baseHeight: layout.reviveIcon.height,
        centerAnchored: true,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: layout.reviveIcon.width,
          height: layout.reviveIcon.height,
        },
        position: rectCenter(layout.reviveIcon),
        image: SWIMMER_UI_IMAGE.playVideoIcon,
        visible: false,
        zIndex: GAME_OVER_OVERLAY_Z.revive + 1,
      }),
    ],
    [layout]
  );

  useAddEntity({ components: panelComponents });
  useAddEntity({ components: titleComponents });
  useAddEntity({ components: subtitleComponents });
  useAddEntity({ components: dividerComponents });
  useAddEntity({ components: scoreLabelComponents });
  useAddEntity({ components: scoreValueComponents });
  useAddEntity({ components: bestLabelComponents });
  useAddEntity({ components: bestValueComponents });
  useAddEntity({ components: newBestComponents });
  useAddEntity({ components: retryButtonComponents });
  useAddEntity({ components: retryIconComponents });
  useAddEntity({ components: retryLabelComponents });
  useAddEntity({ components: reviveButtonComponents });
  useAddEntity({ components: reviveIconComponents });
  useAddEntity({ components: reviveTitleComponents });
  useAddEntity({ components: reviveSubtitleComponents });

  return null;
};
