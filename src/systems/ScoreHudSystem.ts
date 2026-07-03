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
  ScoreComponentData,
  ScoreComponentName,
  ScoreHudAnimState,
} from '@/Game/ecs-components/Score';
import {
  ScoreHudTagComponentData,
  ScoreHudTagComponentName,
} from '@/Game/ecs-components/ScoreHudTag';
import { SwimmerComponentName, SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import { getGameSession, isStartReady, isGameOverPhase } from '@/Game/session/gameSessionQuery';
import {
  easeOutBack,
  easeOutCubic,
} from '@/Game/session/beginGameplay';
import { layoutScoreHud } from '@/Game/ui/scoreHudLayout';
import { SCORE_HUD_COLORS, SCORE_HUD_PANEL_OPACITY } from '@/Game/ui/scoreHudVisuals';
import { refSize } from '@/Game/ui/refLayout';
import { COLOR_REWARD_YELLOW, COLOR_TEXT_WHITE } from '@/Game/ui/swimmerTheme';
import { gameplayFeedbackCopy } from '@/config/gameplayFeedback';
import { scoreHudTuning } from '@/config/scoreHudTuning';
import { Skia } from '@shopify/react-native-skia';

const ENTRANCE_MS = 220;
const ENTRANCE_DELAY_MS = 50;
const POP_MS = 150;
const MILESTONE_POP_MS = 220;
const NEW_BEST_MS = 850;
const MILESTONE_STEP = 10;

const computeEntranceT = (startMs: number, nowMs: number): number => {
  'worklet';
  if (startMs <= 0) return 1;
  const elapsed = nowMs - startMs - ENTRANCE_DELAY_MS;
  if (elapsed <= 0) return 0;
  return Math.min(1, elapsed / ENTRANCE_MS);
};

const computePopScale = (
  startMs: number,
  nowMs: number,
  durationMs: number,
  peak: number
): number => {
  'worklet';
  if (startMs <= 0) return 1;
  const t = (nowMs - startMs) / durationMs;
  if (t >= 1) return 1;
  if (t < 0.5) {
    return 1 + (peak - 1) * easeOutCubic(t * 2);
  }
  return peak - (peak - 1) * easeOutCubic((t - 0.5) * 2);
};

const computeNewBestT = (startMs: number, nowMs: number): number => {
  'worklet';
  if (startMs <= 0) return 1;
  return Math.min(1, (nowMs - startMs) / NEW_BEST_MS);
};

const computeComboPulseWave = (nowMs: number): number => {
  'worklet';
  const period = scoreHudTuning.COMBO_PULSE_PERIOD_MS;
  const t = (nowMs % period) / period;
  return (Math.sin(t * Math.PI * 2) + 1) / 2;
};

const computeComboPulseScale = (nowMs: number): number => {
  'worklet';
  const wave = computeComboPulseWave(nowMs);
  const peak = scoreHudTuning.COMBO_PULSE_SCALE_PEAK;
  return 1 + (peak - 1) * wave;
};

const computeComboPulseOpacity = (nowMs: number): number => {
  'worklet';
  const wave = computeComboPulseWave(nowMs);
  const min = scoreHudTuning.COMBO_PULSE_OPACITY_MIN;
  return min + (1 - min) * wave;
};

const lerpDisplayedInteger = (
  current: number,
  target: number,
  deltaMs: number
): number => {
  'worklet';
  if (current === target) return target;
  const diff = target - current;
  const maxStep = Math.max(1, Math.round(Math.abs(diff) * 6 * (deltaMs / 1000)));
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
};

const resetHudAnim = (hud: ScoreHudAnimState): void => {
  'worklet';
  hud.displayedInteger = 0;
  hud.lastInteger = 0;
  hud.entranceStartMs = 0;
  hud.popStartMs = 0;
  hud.milestonePopStartMs = 0;
  hud.newBestStartMs = 0;
  hud.beatBestShown = false;
  hud.lastMilestone = 0;
  hud.lastComboTier = 0;
  hud.comboPopStartMs = 0;
};

export const ScoreHudSystem: System = {
  name: 'scoreHudSystem',
  requiredComponents: [ScoreHudTagComponentName],
  process: ({ components, deltaTime, ecs, dimensions, safeAreaInsets }) => {
    'worklet';

    const session = getGameSession(components);
    const swimmerData = firstDataFromStore(
      components[SwimmerComponentName]
    ) as SwimmerComponentData | undefined;
    const isInInitialPhase = swimmerData?.isInInitialPhase ?? true;
    const nowMs = Date.now();
    const screenW = dimensions.value.width || 1;
    const screenH = dimensions.value.height || 1;
    const overlayOpacity = session?.overlayOpacity ?? 1;
    const showHud =
      session?.phase === 'playing' &&
      overlayOpacity <= 0.01 &&
      !isInInitialPhase &&
      !isStartReady(session) &&
      !isGameOverPhase(session);

    const layout = layoutScoreHud(screenW, screenH, safeAreaInsets.value);
    const bestScoreLine = `${Math.floor(session?.bestScore ?? 0)}`;

    const scoreEntities = ecs.getEntitiesWithComponents([ScoreComponentName]);
    let scoreEntity: number | undefined;
    let scoreData: ScoreComponentData | undefined;
    for (let i = 0; i < scoreEntities.length; i++) {
      const entityId = scoreEntities[i];
      const data = components[ScoreComponentName].get(entityId) as
        | ScoreComponentData
        | undefined;
      if (data) {
        scoreEntity = entityId;
        scoreData = data;
        break;
      }
    }

    if (!scoreData || scoreEntity === undefined) return;

    const targetInteger = Math.floor(scoreData.score);
    let hud = scoreData.hud;
    let entranceStartMs = hud.entranceStartMs;

    if (!showHud) {
      if (session?.phase === 'start_ready' && hud.entranceStartMs > 0) {
        ecs.updateComponent<ScoreComponentData>(
          scoreEntity,
          ScoreComponentName,
          (s) => {
            resetHudAnim(s.hud);
            s.score = 0;
            s.accumulatedTime = 0;
          }
        );
        hud = { ...hud, entranceStartMs: 0 };
        entranceStartMs = 0;
      }
    } else if (entranceStartMs <= 0) {
      entranceStartMs = nowMs;
      ecs.updateComponent<ScoreComponentData>(
        scoreEntity,
        ScoreComponentName,
        (s) => {
          s.hud.entranceStartMs = nowMs;
        }
      );
      hud = { ...hud, entranceStartMs: nowMs };
    }

    const nextDisplayed = showHud
      ? lerpDisplayedInteger(hud.displayedInteger, targetInteger, deltaTime)
      : hud.displayedInteger;
    const displayInteger = Math.round(nextDisplayed);

    if (showHud && displayInteger > hud.lastInteger) {
      ecs.updateComponent<ScoreComponentData>(
        scoreEntity,
        ScoreComponentName,
        (s) => {
          const h = s.hud;
          h.popStartMs = nowMs;
          if (
            displayInteger >= h.lastMilestone + MILESTONE_STEP ||
            (h.lastMilestone === 0 && displayInteger >= MILESTONE_STEP)
          ) {
            h.lastMilestone =
              Math.floor(displayInteger / MILESTONE_STEP) * MILESTONE_STEP;
            h.milestonePopStartMs = nowMs;
          }
          if (
            session &&
            session.bestScore > 0 &&
            displayInteger > session.bestScore &&
            !h.beatBestShown
          ) {
            h.beatBestShown = true;
            h.newBestStartMs = nowMs;
          }
          h.lastInteger = displayInteger;
          h.displayedInteger = nextDisplayed;
        }
      );
      hud = {
        ...hud,
        popStartMs: nowMs,
        lastInteger: displayInteger,
        displayedInteger: nextDisplayed,
      };
    } else if (showHud && nextDisplayed !== hud.displayedInteger) {
      ecs.updateComponent<ScoreComponentData>(
        scoreEntity,
        ScoreComponentName,
        (s) => {
          s.hud.displayedInteger = nextDisplayed;
        }
      );
      hud = { ...hud, displayedInteger: nextDisplayed };
    }

    const entranceT = computeEntranceT(entranceStartMs, nowMs);
    const entranceEased = easeOutBack(entranceT);
    const hudOpacity = showHud ? entranceT : 0;
    const stackScale = 0.94 + 0.06 * entranceEased;
    const milestoneScale = computePopScale(
      hud.milestonePopStartMs,
      nowMs,
      MILESTONE_POP_MS,
      1.03
    );
    const panelScale = stackScale * milestoneScale;
    const slideX = showHud ? -refSize(16, screenW, screenH) * (1 - entranceEased) : 0;
    const slideY = showHud ? -refSize(14, screenW, screenH) * (1 - entranceEased) : 0;
    const valuePopScale = computePopScale(
      hud.popStartMs,
      nowMs,
      POP_MS,
      hud.milestonePopStartMs > 0 &&
        nowMs - hud.milestonePopStartMs < MILESTONE_POP_MS
        ? 1.1
        : 1.06
    );
    const newBestT = computeNewBestT(hud.newBestStartMs, nowMs);
    const newBestVisible =
      hud.newBestStartMs > 0 && newBestT < 1 && showHud;
    const newBestOpacity =
      newBestT < 0.2
        ? newBestT / 0.2
        : newBestT > 0.72
          ? 1 - (newBestT - 0.72) / 0.28
          : 1;
    const newBestYOffset = -refSize(20, screenW, screenH) * newBestT;

    const comboTier = swimmerData?.locomotion.visualStrokeTier ?? 1;
    let comboPopStartMs = hud.comboPopStartMs;
    let lastComboTier = hud.lastComboTier;
    if (showHud && comboTier >= 2 && comboTier > lastComboTier) {
      comboPopStartMs = nowMs;
      lastComboTier = comboTier;
      if (scoreEntity !== undefined) {
        ecs.updateComponent<ScoreComponentData>(
          scoreEntity,
          ScoreComponentName,
          (s) => {
            s.hud.comboPopStartMs = nowMs;
            s.hud.lastComboTier = comboTier;
          }
        );
        hud = { ...hud, comboPopStartMs: nowMs, lastComboTier: comboTier };
      }
    } else if (comboTier < 2 && lastComboTier !== comboTier) {
      lastComboTier = comboTier;
      if (scoreEntity !== undefined) {
        ecs.updateComponent<ScoreComponentData>(
          scoreEntity,
          ScoreComponentName,
          (s) => {
            s.hud.lastComboTier = comboTier;
          }
        );
        hud = { ...hud, lastComboTier: comboTier };
      }
    }
    const comboLabel = comboTier >= 3 ? '×3' : comboTier === 2 ? '×2' : '';
    const comboVisible = showHud && comboTier >= 2;
    const comboPopScale = computePopScale(comboPopStartMs, nowMs, POP_MS, 1.15);
    const comboPulseScale = comboVisible ? computeComboPulseScale(nowMs) : 1;
    const comboScale = comboPopScale * comboPulseScale;
    const comboPulseOpacity = comboVisible ? computeComboPulseOpacity(nowMs) : 1;

    const tagStore = components[ScoreHudTagComponentName];
    if (!tagStore) return;

    tagStore.forEach((entityId, tag) => {
      const hudTag = tag as ScoreHudTagComponentData;
      const renderData = components[RenderComponentName]?.get(entityId) as
        | RenderComponentData
        | undefined;
      const textData = components[TextComponentName]?.get(entityId) as
        | TextComponentData
        | undefined;
      if (!renderData) return;

      const isValue = hudTag.role === 'value';
      const isCrown = hudTag.role === 'crown';
      const isPanel = hudTag.role === 'panel';
      const isNewBest = hudTag.role === 'newBest';
      const isComboBadge = hudTag.role === 'comboBadge';
      const isComboStreakLabel = hudTag.role === 'comboStreakLabel';
      const isComboElement = isComboBadge || isComboStreakLabel;
      const roleScale = isValue
        ? valuePopScale
        : isCrown
          ? stackScale
          : isPanel
            ? panelScale
            : isComboElement
              ? comboScale
              : 1;

      const scalesShape = isCrown || isValue || isPanel || isComboElement;
      const w = hudTag.baseWidth * (scalesShape ? roleScale : 1);
      const h = hudTag.baseHeight * (scalesShape ? roleScale : 1);
      const offsetX =
        hudTag.baseX + slideX + (hudTag.baseWidth - w) / 2;
      const offsetY =
        hudTag.baseY + slideY + (hudTag.baseHeight - h) / 2;

      let posX = hudTag.centerAnchored ? offsetX + w / 2 : hudTag.baseX + slideX;
      let posY = hudTag.centerAnchored
        ? offsetY + h / 2
        : hudTag.baseY + slideY + (isValue ? (hudTag.baseHeight - h) / 2 : 0);

      if (isNewBest) {
        posY += newBestYOffset;
      }

      const visible =
        showHud &&
        hudOpacity > 0.01 &&
        (!isNewBest || newBestVisible) &&
        (!isComboElement || comboVisible);

      const elementOpacity = isNewBest
        ? hudOpacity * newBestOpacity
        : isPanel
          ? hudOpacity * SCORE_HUD_PANEL_OPACITY
          : isComboElement
            ? hudOpacity * comboPulseOpacity
            : hudOpacity;

      ecs.updateComponent<RenderComponentData>(
        entityId,
        RenderComponentName,
        (r) => {
          r.visible = visible;
          r.opacity = elementOpacity;
          r.position = { x: posX, y: posY };
          if (r.shape.type === ShapeTypes.Rectangle && scalesShape) {
            const radius =
              isPanel && layout.borderRadius > 0
                ? layout.borderRadius * (w / hudTag.baseWidth)
                : (r.shape as { borderRadius?: number }).borderRadius;
            r.shape = {
              type: ShapeTypes.Rectangle,
              width: w,
              height: h,
              ...(radius != null ? { borderRadius: radius } : {}),
            };
          }
          if (isPanel) {
            r.fillColor = SCORE_HUD_COLORS.panelFill;
            const newBestGlow =
              session &&
              session.bestScore > 0 &&
              hud.newBestStartMs > 0 &&
              nowMs - hud.newBestStartMs < 400;
            r.strokeColor = newBestGlow
              ? SCORE_HUD_COLORS.panelBorderNewBest
              : SCORE_HUD_COLORS.panelBorder;
            r.lineWidth = 2;
          }
          r.isDirty = true;
        }
      );

      if (!textData) return;

      if (isValue) {
        const fontSize = layout.fonts.value * valuePopScale;
        const scoreLine = `${displayInteger}`;
        const brightPulse =
          hud.popStartMs > 0 && nowMs - hud.popStartMs < POP_MS * 0.45;
        ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
          if (t.text !== scoreLine) {
            t.text = scoreLine;
            t.isDirty = true;
          }
          if (t.fontSize !== fontSize) {
            t.fontSize = fontSize;
            t.isDirty = true;
          }
          t.color = Skia.Color(brightPulse ? '#FFF8E7' : COLOR_TEXT_WHITE);
          t.opacity = elementOpacity;
        });
        return;
      }

      if (hudTag.role === 'bestLabel') {
        ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
          t.opacity = elementOpacity;
          const labelFlash =
            hud.milestonePopStartMs > 0 &&
            nowMs - hud.milestonePopStartMs < MILESTONE_POP_MS * 0.5;
          t.color = Skia.Color(labelFlash ? '#FFF4B8' : COLOR_REWARD_YELLOW);
        });
        return;
      }

      if (hudTag.role === 'bestValue') {
        ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
          t.opacity = elementOpacity;
          if (t.text !== bestScoreLine) {
            t.text = bestScoreLine;
            t.isDirty = true;
          }
        });
        return;
      }

      if (isNewBest) {
        ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
          t.opacity = elementOpacity;
          const pop = computePopScale(hud.newBestStartMs, nowMs, 260, 1.1);
          t.fontSize = layout.fonts.newBest * pop;
          t.isDirty = true;
        });
        return;
      }

      if (isComboBadge && textData) {
        ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
          t.opacity = elementOpacity;
          if (t.text !== comboLabel) {
            t.text = comboLabel;
            t.isDirty = true;
          }
          t.fontSize = layout.fonts.comboBadge * comboScale;
          t.isDirty = true;
        });
        return;
      }

      if (isComboStreakLabel && textData) {
        ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
          t.opacity = elementOpacity;
          const label = gameplayFeedbackCopy.TAP_STREAK_LABEL;
          if (t.text !== label) {
            t.text = label;
            t.isDirty = true;
          }
          t.fontSize = layout.fonts.comboStreakLabel * comboScale;
          t.isDirty = true;
        });
      }
    });
  },
};
