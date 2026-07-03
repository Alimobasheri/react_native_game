import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
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
  StageOverlayTagComponentData,
  StageOverlayTagComponentName,
} from '@/Game/ecs-components/StageOverlayTag';
import {
  formatStageDoneLabel,
  formatStageLabel,
} from '@/config/stageProgression';
import { stageOverlayTuning } from '@/config/stageOverlayTuning';
import { layoutStageOverlay } from '@/Game/ui/stageOverlayLayout';
import {
  easeInOutSine,
  easeOutBack,
} from '@/Game/session/beginGameplay';
import { getGameSessionEntity } from '@/Game/session/gameSessionQuery';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { Skia, TextAlign } from '@shopify/react-native-skia';

const overlayDurationMs = (
  kind: GameSessionComponentData['stageOverlayKind']
): number => {
  'worklet';
  if (kind === 'intro') return stageOverlayTuning.INTRO_MS;
  if (kind === 'done') return stageOverlayTuning.DONE_MS;
  if (kind === 'next') return stageOverlayTuning.NEXT_MS;
  return 0;
};

const computeOverlayOpacity = (
  kind: GameSessionComponentData['stageOverlayKind'],
  startMs: number,
  nowMs: number
): number => {
  'worklet';
  if (!kind || kind === 'none' || startMs <= 0) return 0;
  const duration = overlayDurationMs(kind);
  if (duration <= 0) return 0;
  const t = Math.min(1, Math.max(0, (nowMs - startMs) / duration));
  const fadeInEnd = 0.18;
  const fadeOutStart = 0.72;
  if (t < fadeInEnd) {
    return easeOutBack(t / fadeInEnd);
  }
  if (t > fadeOutStart) {
    const u = (t - fadeOutStart) / (1 - fadeOutStart);
    return Math.max(0, 1 - easeInOutSine(u));
  }
  return 1;
};

const computeOverlaySlideY = (
  kind: GameSessionComponentData['stageOverlayKind'],
  startMs: number,
  nowMs: number,
  screenH: number
): number => {
  'worklet';
  if (!kind || kind === 'none' || startMs <= 0) return 0;
  const duration = overlayDurationMs(kind);
  const t = Math.min(1, Math.max(0, (nowMs - startMs) / Math.max(1, duration)));
  const introT = Math.min(1, t / 0.22);
  const slidePx = screenH * 0.08;
  return -slidePx * (1 - easeOutBack(introT));
};

const anchorTextPosition = (
  centerX: number,
  centerY: number,
  boxWidth: number,
  fontSize: number
): { x: number; y: number } => {
  'worklet';
  return {
    x: centerX - boxWidth * 0.5,
    y: centerY - fontSize * 0.55,
  };
};

export const StageOverlaySystem: System = {
  name: 'stageOverlaySystem',
  requiredComponents: [GameSessionComponentName],
  process: ({ components, ecs, dimensions }) => {
    'worklet';

    const sessionEntity = getGameSessionEntity(components);
    if (typeof sessionEntity !== 'number') return;

    const session = components[GameSessionComponentName]?.get(
      sessionEntity
    ) as GameSessionComponentData | undefined;
    if (!session || session.phase !== 'playing') return;

    const tagStore = components[StageOverlayTagComponentName];
    if (!tagStore) return;

    const nowMs = Date.now();
    const screenW = dimensions.value.width || 1;
    const screenH = dimensions.value.height || 1;
    const layout = layoutStageOverlay(screenW, screenH, 0);
    const kind = session.stageOverlayKind ?? 'none';
    const burstOpacity = computeOverlayOpacity(
      kind,
      session.stageOverlayStartMs ?? 0,
      nowMs
    );
    const slideY = computeOverlaySlideY(
      kind,
      session.stageOverlayStartMs ?? 0,
      nowMs,
      screenH
    );

    const stageIndex = session.stageIndex ?? 1;
    const persistentText = formatStageLabel(stageIndex);
    let centerBurstText = '';
    let doneBurstText = '';
    if (kind === 'intro' || kind === 'next') {
      centerBurstText = formatStageLabel(stageIndex);
    } else if (kind === 'done') {
      doneBurstText = formatStageDoneLabel(stageIndex);
    }

    tagStore.forEach((entityId, tag) => {
      const overlayTag = tag as StageOverlayTagComponentData;
      const textData = components[TextComponentName]?.get(entityId) as
        | TextComponentData
        | undefined;
      const renderData = components[RenderComponentName]?.get(entityId) as
        | RenderComponentData
        | undefined;
      if (!textData || !renderData) return;

      const role = overlayTag.role;
      let text = '';
      let fontSize = layout.persistentFontSize;
      let anchorX = layout.hudX;
      let anchorY = layout.hudY;
      let opacity = 0;
      let visible = false;
      let boxWidth = layout.centerTextWidth;

      if (role === 'persistentHud') {
        text = persistentText;
        fontSize = layout.persistentFontSize;
        anchorX = layout.hudX;
        anchorY = layout.hudY;
        opacity = 1;
        visible = true;
      } else if (role === 'center') {
        text = centerBurstText;
        fontSize =
          kind === 'intro' ? layout.introFontSize : layout.nextFontSize;
        anchorX = layout.centerX;
        anchorY = layout.centerY + slideY;
        opacity = burstOpacity;
        visible = burstOpacity > 0.01 && centerBurstText.length > 0;
        boxWidth = layout.centerTextWidth;
      } else if (role === 'topDone') {
        text = doneBurstText;
        fontSize = layout.doneFontSize;
        anchorX = layout.doneX;
        anchorY = layout.doneY + slideY;
        opacity = burstOpacity;
        visible = burstOpacity > 0.01 && doneBurstText.length > 0;
        boxWidth = layout.centerTextWidth;
      }

      const pos = anchorTextPosition(anchorX, anchorY, boxWidth, fontSize);

      ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
        'worklet';
        if (t.text !== text) {
          t.text = text;
          t.isDirty = true;
        }
        if (t.fontSize !== fontSize) {
          t.fontSize = fontSize;
          t.isDirty = true;
        }
        if (t.maxWidth !== boxWidth) {
          t.maxWidth = boxWidth;
          t.isDirty = true;
        }
        if (t.align !== TextAlign.Center) {
          t.align = TextAlign.Center;
          t.isDirty = true;
        }
        if (t.opacity !== opacity) {
          t.opacity = opacity;
          t.isDirty = true;
        }
      });

      ecs.updateComponent<RenderComponentData>(entityId, RenderComponentName, (r) => {
        'worklet';
        r.position = pos;
        r.visible = visible;
        r.opacity = opacity;
        r.zIndex = SwimmerRenderLayer.Hud + (role === 'persistentHud' ? 4 : 6);
        r.renderLayer = SwimmerRenderLayer.Hud;
        r.isDirty = true;
      });
    });

    if (
      kind !== 'none' &&
      burstOpacity <= 0.001 &&
      (session.stageOverlayStartMs ?? 0) > 0 &&
      nowMs - (session.stageOverlayStartMs ?? 0) > overlayDurationMs(kind)
    ) {
      ecs.updateComponent<GameSessionComponentData>(
        sessionEntity,
        GameSessionComponentName,
        (s) => {
          'worklet';
          s.stageOverlayKind = 'none';
        }
      );
    }
  },
};
