import {
  useCanvasDimensions,
  useAddEntity,
  useAddSystem,
  useRNTGESafeAreaInsets,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createScoreComponent } from '@/Game/ecs-components/Score';
import { createScoreHudTagComponent } from '@/Game/ecs-components/ScoreHudTag';
import { layoutScoreHud } from '@/Game/ui/scoreHudLayout';
import { SCORE_HUD_COLORS, SCORE_HUD_PANEL_OPACITY } from '@/Game/ui/scoreHudVisuals';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { ScoreSystem } from '@/systems/PhysicsSystem/ScoreSystem';
import { ScoreHudSystem } from '@/systems/ScoreHudSystem';
import { SWIMMER_UI_IMAGE } from '@/assets/swimmerUi';
import {
  COLOR_CAVE_DEEP,
  COLOR_REWARD_YELLOW,
  COLOR_TEXT_WHITE,
} from '@/Game/ui/swimmerTheme';
import { gameplayFeedbackCopy } from '@/config/gameplayFeedback';
import { scoreHudTuning } from '@/config/scoreHudTuning';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

export const ScoreView: FC = () => {
  const dimensions = useCanvasDimensions();
  const safeAreaInsets = useRNTGESafeAreaInsets();

  const panelComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const panel = layout.panel;
    return [
      createScoreHudTagComponent({
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
          borderRadius: layout.borderRadius,
        },
        position: { x: panel.centerX, y: panel.centerY },
        fillColor: SCORE_HUD_COLORS.panelFill,
        strokeColor: SCORE_HUD_COLORS.panelBorder,
        lineWidth: 2,
        opacity: SCORE_HUD_PANEL_OPACITY,
        visible: false,
        zIndex: 0,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  const crownComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const crown = layout.crown;
    return [
      createScoreHudTagComponent({
        role: 'crown',
        baseX: crown.x,
        baseY: crown.y,
        baseWidth: crown.width,
        baseHeight: crown.height,
        centerAnchored: true,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: crown.width,
          height: crown.height,
        },
        position: { x: crown.centerX, y: crown.centerY },
        image: SWIMMER_UI_IMAGE.iconCrownGold,
        visible: false,
        zIndex: 1,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  const valueComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const value = layout.value;
    return [
      createScoreComponent({
        score: 0,
        accumulatedTime: 0,
      }),
      createScoreHudTagComponent({
        role: 'value',
        baseX: value.x,
        baseY: value.y,
        baseWidth: value.width,
        baseHeight: value.height,
      }),
      createTextComponent({
        text: '0',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.value,
        color: Skia.Color(COLOR_TEXT_WHITE),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 3.5,
        align: TextAlign.Left,
        maxWidth: value.width,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: value.width,
          height: value.height,
        },
        position: { x: value.x, y: value.y },
        visible: false,
        zIndex: 2,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  const bestLabelComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const label = layout.bestLabel;
    return [
      createScoreHudTagComponent({
        role: 'bestLabel',
        baseX: label.x,
        baseY: label.y,
        baseWidth: label.width,
        baseHeight: label.height,
      }),
      createTextComponent({
        text: 'BEST',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.bestLabel,
        color: Skia.Color(COLOR_REWARD_YELLOW),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 2.5,
        align: TextAlign.Left,
        maxWidth: label.width,
        letterSpacing: 1,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: label.width,
          height: label.height,
        },
        position: { x: label.x, y: label.y },
        visible: false,
        zIndex: 2,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  const bestValueComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const best = layout.bestValue;
    return [
      createScoreHudTagComponent({
        role: 'bestValue',
        baseX: best.x,
        baseY: best.y,
        baseWidth: best.width,
        baseHeight: best.height,
      }),
      createTextComponent({
        text: '0',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.bestValue,
        color: Skia.Color(COLOR_TEXT_WHITE),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 2.5,
        align: TextAlign.Left,
        maxWidth: best.width,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: best.width,
          height: best.height,
        },
        position: { x: best.x, y: best.y },
        visible: false,
        zIndex: 2,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  const newBestComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const tag = layout.newBest;
    return [
      createScoreHudTagComponent({
        role: 'newBest',
        baseX: tag.x,
        baseY: tag.y,
        baseWidth: tag.width,
        baseHeight: tag.height,
      }),
      createTextComponent({
        text: 'NEW BEST!',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.newBest,
        color: Skia.Color(COLOR_REWARD_YELLOW),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 2.5,
        align: TextAlign.Left,
        maxWidth: tag.width,
        letterSpacing: 0.6,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: tag.width,
          height: tag.height,
        },
        position: { x: tag.x, y: tag.y },
        visible: false,
        zIndex: 3,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  const comboBadgeComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const badge = layout.comboBadge;
    return [
      createScoreHudTagComponent({
        role: 'comboBadge',
        baseX: badge.x,
        baseY: badge.y,
        baseWidth: badge.width,
        baseHeight: badge.height,
      }),
      createTextComponent({
        text: '×2',
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.comboBadge,
        color: Skia.Color(COLOR_REWARD_YELLOW),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 2.5,
        align: TextAlign.Center,
        maxWidth: badge.width,
        textShadow: scoreHudTuning.COMBO_TEXT_SHADOW,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: badge.width,
          height: badge.height,
        },
        position: { x: badge.x, y: badge.y },
        visible: false,
        zIndex: 4,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  const comboStreakLabelComponents = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets);
    const label = layout.comboStreakLabel;
    return [
      createScoreHudTagComponent({
        role: 'comboStreakLabel',
        baseX: label.x,
        baseY: label.y,
        baseWidth: label.width,
        baseHeight: label.height,
      }),
      createTextComponent({
        text: gameplayFeedbackCopy.FLOW_STREAK_LABEL,
        fontAssetId: 'Fredoka',
        fontSize: layout.fonts.comboStreakLabel,
        color: Skia.Color(COLOR_TEXT_WHITE),
        strokeColor: COLOR_CAVE_DEEP,
        strokeWidth: 2,
        align: TextAlign.Center,
        maxWidth: label.width,
        textShadow: scoreHudTuning.COMBO_TEXT_SHADOW,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: label.width,
          height: label.height,
        },
        position: { x: label.x, y: label.y },
        visible: false,
        zIndex: 4,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, safeAreaInsets]);

  useAddEntity({ components: panelComponents });
  useAddEntity({ components: crownComponents });
  useAddEntity({ components: valueComponents });
  useAddEntity({ components: bestLabelComponents });
  useAddEntity({ components: bestValueComponents });
  useAddEntity({ components: newBestComponents });
  useAddEntity({ components: comboBadgeComponents });
  useAddEntity({ components: comboStreakLabelComponents });
  useAddSystem({ system: ScoreSystem });
  useAddSystem({ system: ScoreHudSystem });

  return null;
};
