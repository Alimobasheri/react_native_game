import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  TextComponentData,
  TextComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import {
  GameOverOverlayTagComponentData,
  GameOverOverlayTagComponentName,
} from '@/Game/ecs-components/GameOverOverlayTag';
import {
  computeGameOverDimOpacity,
  computeGameOverPanelIntroT,
  computeGameOverPanelScale,
  computeGameOverRetryIntroT,
  computeGameOverReviveIntroT,
  computeGameOverScoreDisplay,
} from '@/Game/session/beginGameplay';
import { getGameSessionEntity } from '@/Game/session/gameSessionQuery';
import { gameSessionTuning } from '@/config/swimmerTuning';
import {
  GAME_OVER_PANEL_COLORS,
} from '@/Game/ui/gameOverPanelVisuals';
import {
  COLOR_CAVE_DEEP,
  COLOR_REWARD_YELLOW,
  COLOR_TEXT_WHITE,
} from '@/Game/ui/swimmerTheme';
import { Skia } from '@shopify/react-native-skia';

const RETRY_PRESS_DOWN_MS = 90;
const RETRY_PRESS_RELEASE_MS = 110;
const RETRY_PRESS_SCALE_MIN = 0.94;
const GAME_OVER_FADE_OUT_MS = gameSessionTuning.GAME_OVER_FADE_OUT_MS;

const easeInOutSine = (t: number): number => {
  'worklet';
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

const easeOutCubic = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
};

const computeRetryPressScale = (pressStartMs: number, nowMs: number): number => {
  'worklet';
  if (pressStartMs <= 0) return 1;
  const elapsed = nowMs - pressStartMs;
  const delta = 1 - RETRY_PRESS_SCALE_MIN;
  if (elapsed < RETRY_PRESS_DOWN_MS) {
    return 1 - delta * easeOutCubic(elapsed / RETRY_PRESS_DOWN_MS);
  }
  if (elapsed < RETRY_PRESS_DOWN_MS + RETRY_PRESS_RELEASE_MS) {
    const t = (elapsed - RETRY_PRESS_DOWN_MS) / RETRY_PRESS_RELEASE_MS;
    return RETRY_PRESS_SCALE_MIN + delta * easeInOutSine(t);
  }
  return 1;
};

const panelSlideYOffset = (introT: number): number => {
  'worklet';
  if (introT <= 0) return 48;
  return 48 * (1 - easeOutCubic(introT));
};

const isGroupChildRole = (role: string): boolean => {
  'worklet';
  return role !== 'dim';
};

export const GameOverScreenSystem: System = {
  name: 'gameOverScreenSystem',
  requiredComponents: [GameSessionComponentName],
  process: ({ components, ecs, dimensions }) => {
    'worklet';

    const sessionEntity = getGameSessionEntity(components);
    if (typeof sessionEntity !== 'number') return;

    const session = components[GameSessionComponentName].get(
      sessionEntity
    ) as GameSessionComponentData | undefined;
    if (!session) return;

    const nowMs = Date.now();
    const dimOpacity = computeGameOverDimOpacity(session, nowMs);
    const introT = computeGameOverPanelIntroT(session, nowMs);
    const panelScale = computeGameOverPanelScale(introT);
    const panelSlideY = panelSlideYOffset(introT);
    const retryIntroT = computeGameOverRetryIntroT(session, nowMs);
    const reviveIntroT = computeGameOverReviveIntroT(session, nowMs);
    const retryPressScale = computeRetryPressScale(
      session.gameOverRetryPressStartMs,
      nowMs
    );
    const displayedScore = computeGameOverScoreDisplay(session, nowMs);
    const bestScore = Math.floor(session.bestScore);
    const showNewBest = session.gameOverIsNewBest && introT > 0.35;
    const overlayVisible = session.phase === 'game_over' && introT > 0;

    if (session.gameOverRetryPressStartMs > 0) {
      const pressElapsed = nowMs - session.gameOverRetryPressStartMs;
      if (pressElapsed >= RETRY_PRESS_DOWN_MS + RETRY_PRESS_RELEASE_MS) {
        ecs.updateComponent<GameSessionComponentData>(
          sessionEntity,
          GameSessionComponentName,
          (s) => {
            s.gameOverRetryPressStartMs = 0;
          }
        );
      }
    }

    const tagStore = components[GameOverOverlayTagComponentName];
    if (!tagStore) return;

    tagStore.forEach((entityId, tag) => {
      const overlayTag = tag as GameOverOverlayTagComponentData;
      const renderData = components[RenderComponentName]?.get(entityId) as
        | RenderComponentData
        | undefined;
      const textData = components[TextComponentName]?.get(entityId) as
        | TextComponentData
        | undefined;
      if (!renderData) return;

      const role = overlayTag.role;
      const isDim = role === 'dim';
      const isPanel = role === 'panel';
      const isRetry =
        role === 'retryButton' ||
        role === 'retryIcon' ||
        role === 'retryLabel';
      const isRevive =
        role === 'reviveButton' ||
        role === 'reviveIcon' ||
        role === 'reviveTitle' ||
        role === 'reviveSubtitle';
      const isNewBestTag = role === 'newBestTag';

      let elementOpacity = 1;
      if (isDim) {
        elementOpacity = dimOpacity;
      } else if (!overlayVisible) {
        elementOpacity = 0;
      } else if (session.gameOverOverlayFadeStartMs > 0) {
        const fadeT = Math.min(
          1,
          (nowMs - session.gameOverOverlayFadeStartMs) / GAME_OVER_FADE_OUT_MS
        );
        elementOpacity = Math.max(0, 1 - easeInOutSine(fadeT));
      }

      if (isRetry) {
        elementOpacity *= retryIntroT;
      }
      if (isRevive) {
        elementOpacity *= reviveIntroT;
      }
      if (isNewBestTag) {
        elementOpacity = showNewBest ? elementOpacity : 0;
      }

      let scale = 1;
      if (isPanel) {
        scale = panelScale;
      }
      if (role === 'retryButton') {
        scale *= retryPressScale;
      }
      if (isNewBestTag && showNewBest) {
        scale *= 1 + 0.08 * Math.sin(introT * Math.PI);
      }

      const scalesSize =
        isPanel || role === 'retryButton' || role === 'reviveButton';
      const w = overlayTag.baseWidth * (scalesSize ? scale : 1);
      const h = overlayTag.baseHeight * (scalesSize ? scale : 1);

      const slideY = isGroupChildRole(role) ? panelSlideY : 0;
      const offsetX =
        overlayTag.baseX + (overlayTag.baseWidth - w) / 2;
      const offsetY =
        overlayTag.baseY + (overlayTag.baseHeight - h) / 2 + slideY;

      let posX = overlayTag.centerAnchored ? offsetX + w / 2 : overlayTag.baseX;
      let posY = overlayTag.centerAnchored
        ? offsetY + h / 2
        : overlayTag.baseY + slideY;

      if (!overlayTag.centerAnchored && textData && role === 'scoreValue') {
        posY = overlayTag.baseY + slideY + (overlayTag.baseHeight - h) / 2;
      }
      if (!overlayTag.centerAnchored && textData && role === 'bestValue') {
        posY = overlayTag.baseY + slideY + (overlayTag.baseHeight - h) / 2;
      }
      if (!overlayTag.centerAnchored && textData && role === 'retryLabel') {
        posY = overlayTag.baseY + slideY + (overlayTag.baseHeight - h) / 2;
      }
      if (isRetry && retryIntroT < 1) {
        posY += 16 * (1 - retryIntroT);
      }
      if (isRevive && reviveIntroT < 1) {
        posY += 16 * (1 - reviveIntroT);
      }

      const visible = isDim
        ? dimOpacity > 0.01
        : overlayVisible && elementOpacity > 0.01;

      ecs.updateComponent<RenderComponentData>(
        entityId,
        RenderComponentName,
        (r) => {
          r.visible = visible;
          r.opacity = isDim ? dimOpacity : elementOpacity;
          r.position = { x: posX, y: posY };
          if (r.shape.type === ShapeTypes.Rectangle && scalesSize) {
            const baseShape = r.shape as {
              width: number;
              height: number;
              borderRadius?: number;
            };
            r.shape = {
              type: ShapeTypes.Rectangle,
              width: w,
              height: h,
              ...(baseShape.borderRadius != null
                ? {
                    borderRadius:
                      baseShape.borderRadius * (w / overlayTag.baseWidth),
                  }
                : {}),
            };
          }
          if (isPanel) {
            r.fillColor = GAME_OVER_PANEL_COLORS.fill;
            r.strokeColor = showNewBest
              ? GAME_OVER_PANEL_COLORS.borderGlow
              : GAME_OVER_PANEL_COLORS.border;
            r.lineWidth = showNewBest ? 3.5 : 3;
          }
          r.isDirty = true;
        }
      );

      if (textData) {
        ecs.updateComponent<TextComponentData>(
          entityId,
          TextComponentName,
          (t) => {
            t.opacity = elementOpacity;
            if (role === 'scoreValue') {
              const line = `${displayedScore}`;
              if (t.text !== line) {
                t.text = line;
                t.isDirty = true;
              }
            }
            if (role === 'bestValue') {
              const line = `${bestScore}`;
              if (t.text !== line) {
                t.text = line;
                t.isDirty = true;
              }
            }
          }
        );
      }
    });
  },
};

export const GAME_OVER_TITLE_COLOR = Skia.Color('#FFE66D');
export const GAME_OVER_SUBTITLE_COLOR = Skia.Color(GAME_OVER_PANEL_COLORS.subtitle);
export const GAME_OVER_SCORE_COLOR = Skia.Color(COLOR_TEXT_WHITE);
export const GAME_OVER_NEW_BEST_COLOR = Skia.Color(COLOR_REWARD_YELLOW);
export const GAME_OVER_TITLE_STROKE = COLOR_CAVE_DEEP;
