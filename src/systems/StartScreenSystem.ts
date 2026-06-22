import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SpriteComponentData,
  SpriteComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/sprite';
import {
  TextComponentData,
  TextComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { TAP_CURSOR_SPRITE } from '@/assets/swimmerUi';
import { getTapCursorChannelPositions } from '@/Game/ui/tapCursorChannelPositions';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import {
  StartOverlayTagComponentData,
  StartOverlayTagComponentName,
} from '@/Game/ecs-components/StartOverlayTag';
import { WaterComponentData, WaterComponentName } from '@/Game/ecs-components/Water';
import {
  computeOverlayDismissT,
  computeOverlayOpacity,
  computeRaisingSpeedForSession,
  computeSpeedRampMultiplier,
  computeTutorialOpacity,
  easeInOutSine,
  easeInQuart,
  easeOutBack,
  easeOutCubic,
  isSessionSpeedRampActive,
} from '@/Game/session/beginGameplay';
import { getGameSessionEntity } from '@/Game/session/gameSessionQuery';
import { gameSessionTuning } from '@/config/swimmerTuning';
import type { StartOverlayRole } from '@/Game/ecs-components/StartOverlayTag';

const { OVERLAY_SLIDE_MS } = gameSessionTuning;
const CTA_BREATHE_PERIOD = 1.5;
const CTA_PRESS_DOWN_MS = 90;
const CTA_PRESS_RELEASE_MS = 110;
const CTA_PRESS_SCALE_MIN = 0.88;
const CTA_INTRO_DELAY_MS = 80;
const TAP_FRAME_COUNT = TAP_CURSOR_SPRITE.totalFrames;
const TAP_FRAME_DURATION_SEC = TAP_CURSOR_SPRITE.frameDurationMs / 1000;
const TAP_SEQUENCE_SEC = TAP_FRAME_COUNT * TAP_FRAME_DURATION_SEC;
const TAP_SIDE_GAP_SEC = TAP_CURSOR_SPRITE.sideGapSec;
const TAP_CYCLE_SEC = (TAP_SEQUENCE_SEC + TAP_SIDE_GAP_SEC) * 2;

type TapCursorBeat = {
  show: boolean;
  frameIndex: number;
  onRight: boolean;
};

const getTapCursorBeat = (animTimeSec: number): TapCursorBeat => {
  'worklet';
  const cycleTime = animTimeSec % TAP_CYCLE_SEC;

  if (cycleTime < TAP_SEQUENCE_SEC) {
    return {
      show: true,
      onRight: true,
      frameIndex: Math.min(
        TAP_FRAME_COUNT - 1,
        Math.floor(cycleTime / TAP_FRAME_DURATION_SEC)
      ),
    };
  }

  if (cycleTime < TAP_SEQUENCE_SEC + TAP_SIDE_GAP_SEC) {
    return { show: false, onRight: true, frameIndex: 0 };
  }

  const leftStart = TAP_SEQUENCE_SEC + TAP_SIDE_GAP_SEC;
  if (cycleTime < leftStart + TAP_SEQUENCE_SEC) {
    const local = cycleTime - leftStart;
    return {
      show: true,
      onRight: false,
      frameIndex: Math.min(
        TAP_FRAME_COUNT - 1,
        Math.floor(local / TAP_FRAME_DURATION_SEC)
      ),
    };
  }

  return { show: false, onRight: false, frameIndex: 0 };
};

/** Smooth oscillation between 1 ± amount (no discontinuity at cycle wrap). */
const pulseScale = (timeSec: number, period: number, amount: number): number => {
  'worklet';
  return 1 + amount * Math.sin((2 * Math.PI * timeSec) / period);
};

const computeCtaPressScale = (ctaPressStartMs: number, nowMs: number): number => {
  'worklet';
  if (ctaPressStartMs <= 0) return 1;
  const elapsed = nowMs - ctaPressStartMs;
  const delta = 1 - CTA_PRESS_SCALE_MIN;
  if (elapsed < CTA_PRESS_DOWN_MS) {
    return 1 - delta * easeOutCubic(elapsed / CTA_PRESS_DOWN_MS);
  }
  if (elapsed < CTA_PRESS_DOWN_MS + CTA_PRESS_RELEASE_MS) {
    const t = (elapsed - CTA_PRESS_DOWN_MS) / CTA_PRESS_RELEASE_MS;
    return CTA_PRESS_SCALE_MIN + delta * easeInOutSine(t);
  }
  return 1;
};

const computeIntroSlideT = (
  role: StartOverlayRole,
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.overlayIntroStartMs <= 0) return 1;
  let delayMs = 0;
  if (role === 'cta' || role === 'ctaLabel') {
    delayMs = CTA_INTRO_DELAY_MS;
  }
  const elapsed = nowMs - session.overlayIntroStartMs - delayMs;
  if (elapsed <= 0) return 0;
  return Math.min(1, elapsed / OVERLAY_SLIDE_MS);
};

const computeRoleSlideY = (
  role: StartOverlayRole,
  introT: number,
  dismissT: number,
  screenH: number
): number => {
  'worklet';
  const slidePx = screenH * 0.12;
  const isTitle = role === 'titleLogo';
  const isCta = role === 'cta' || role === 'ctaLabel';
  if (!isTitle && !isCta) return 0;

  const introEased = easeOutBack(introT);
  const dismissEased = easeInQuart(dismissT);

  let y = 0;
  if (isTitle) {
    y += -slidePx * (1 - introEased);
    y += -slidePx * dismissEased;
  } else if (isCta) {
    y += slidePx * (1 - introEased);
    y += slidePx * dismissEased;
  }
  return y;
};

export const StartScreenSystem: System = {
  name: 'startScreenSystem',
  requiredComponents: [GameSessionComponentName],
  process: ({ entities, components, deltaTime, ecs, dimensions }) => {
    'worklet';

    const sessionEntity = entities[0];
    const session = components[GameSessionComponentName].get(
      sessionEntity
    ) as GameSessionComponentData | undefined;
    if (!session) return;

    const deltaSeconds = deltaTime / 1000;
    const nowMs = Date.now();
    const screenW = dimensions.value.width || 1;
    const screenH = dimensions.value.height || 1;

    let animTimeSec = session.animTimeSec + deltaSeconds;

    const overlayOpacity = computeOverlayOpacity(session, nowMs);
    const tutorialOpacity = computeTutorialOpacity(session, nowMs);

    if (overlayOpacity <= 0.05 && tutorialOpacity <= 0.05) {
      animTimeSec = session.animTimeSec;
    }

    const raisingSpeed = computeRaisingSpeedForSession(session, nowMs);
    const sessionDrivesWaterSpeed =
      session.phase === 'start_ready' ||
      isSessionSpeedRampActive(session, nowMs);
    const tapBeat =
      tutorialOpacity > 0.01
        ? getTapCursorBeat(animTimeSec)
        : { show: false, onRight: true, frameIndex: 0 };

    ecs.updateComponent<GameSessionComponentData>(
      sessionEntity,
      GameSessionComponentName,
      (s) => {
        s.animTimeSec = animTimeSec;
        s.overlayOpacity = overlayOpacity;
      }
    );

    const waterEntity = ecs
      .getEntitiesWithComponents([WaterComponentName])[0];
    if (typeof waterEntity === 'number') {
      if (sessionDrivesWaterSpeed) {
        ecs.updateComponent<WaterComponentData>(
          waterEntity,
          WaterComponentName,
          (w) => {
            w.raisingSpeed = raisingSpeed;
          }
        );
      } else if (
        session.phase === 'playing' &&
        session.speedRampStartMs > 0 &&
        computeSpeedRampMultiplier(session, nowMs) >= 1
      ) {
        const gameplaySpeed = session.gameplayRaisingSpeed;
        ecs.updateComponent<GameSessionComponentData>(
          sessionEntity,
          GameSessionComponentName,
          (s) => {
            s.speedRampStartMs = 0;
          }
        );
        ecs.updateComponent<WaterComponentData>(
          waterEntity,
          WaterComponentName,
          (w) => {
            w.baseSpeed = gameplaySpeed;
            w.raisingSpeed = gameplaySpeed;
          }
        );
      }
    }

    const tagStore = components[StartOverlayTagComponentName];
    if (!tagStore) return;

    const ctaScale = pulseScale(animTimeSec, CTA_BREATHE_PERIOD, 0.035);
    const ctaPressScale = computeCtaPressScale(session.ctaPressStartMs, nowMs);
    const dismissT = computeOverlayDismissT(session, nowMs);

    if (session.ctaPressStartMs > 0) {
      const pressElapsed = nowMs - session.ctaPressStartMs;
      if (pressElapsed >= CTA_PRESS_DOWN_MS + CTA_PRESS_RELEASE_MS) {
        ecs.updateComponent<GameSessionComponentData>(
          sessionEntity,
          GameSessionComponentName,
          (s) => {
            s.ctaPressStartMs = 0;
          }
        );
      }
    }

    const { tapLeftX, tapRightX } = getTapCursorChannelPositions(
      screenW,
      screenH
    );

    tagStore.forEach((entityId, tag) => {
      const overlayTag = tag as StartOverlayTagComponentData;
      const renderData = components[RenderComponentName]?.get(entityId) as
        | RenderComponentData
        | undefined;
      const textData = components[TextComponentName]?.get(entityId) as
        | TextComponentData
        | undefined;
      if (!renderData) return;

      const isTutorialRole =
        overlayTag.role === 'tutorialLabel' || overlayTag.role === 'tapCursor';
      const elementOpacity = isTutorialRole ? tutorialOpacity : overlayOpacity;
      const visible = elementOpacity > 0.01;
      let scale = 1;

      if (
        (overlayTag.role === 'cta' || overlayTag.role === 'ctaLabel') &&
        elementOpacity > 0.01
      ) {
        if (session.phase === 'start_ready' && visible) {
          scale = ctaScale * ctaPressScale;
        } else if (session.phase === 'playing' && session.ctaPressStartMs > 0) {
          scale = ctaPressScale;
        }
      }

      const w = overlayTag.baseWidth * scale;
      const h = overlayTag.baseHeight * scale;
      const boxX = overlayTag.baseX + (overlayTag.baseWidth - w) / 2;
      const boxY = overlayTag.baseY + (overlayTag.baseHeight - h) / 2;

      const useRectCenter = !textData;

      let posX = useRectCenter ? boxX + w / 2 : boxX;
      let posY = useRectCenter ? boxY + h / 2 : boxY;
      const introT = computeIntroSlideT(overlayTag.role, session, nowMs);
      posY += computeRoleSlideY(overlayTag.role, introT, dismissT, screenH);
      let showRender = visible;

      if (overlayTag.role === 'tapCursor') {
        showRender = visible && tapBeat.show;
        if (showRender) {
          posX = tapBeat.onRight ? tapRightX : tapLeftX;
          posY = overlayTag.baseY + h / 2;
        }

        const spriteData = components[SpriteComponentName]?.get(entityId) as
          | SpriteComponentData
          | undefined;
        if (spriteData) {
          ecs.updateComponent<SpriteComponentData>(
            entityId,
            SpriteComponentName,
            (sprite) => {
              sprite.currentFrame = tapBeat.frameIndex;
              sprite.isPlaying = false;
              sprite.loop = false;
            }
          );
        }
      }

      ecs.updateComponent<RenderComponentData>(
        entityId,
        RenderComponentName,
        (r) => {
          r.visible = showRender;
          r.opacity = elementOpacity;
          r.position = { x: posX, y: posY };
          if (r.shape.type === ShapeTypes.Rectangle) {
            r.shape = { type: ShapeTypes.Rectangle, width: w, height: h };
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
            if (overlayTag.role === 'bestScoreValue') {
              const sessionNow = components[GameSessionComponentName].get(
                sessionEntity
              ) as GameSessionComponentData;
              const scoreLine = `${Math.floor(sessionNow?.bestScore ?? 0)}`;
              if (t.text !== scoreLine) {
                t.text = scoreLine;
                t.isDirty = true;
              }
            }
          }
        );
      }
    });
  },
};

export const getGameSessionEntityId = getGameSessionEntity;
