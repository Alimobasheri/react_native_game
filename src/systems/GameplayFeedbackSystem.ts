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
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import { SwimmerComponentName, SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import {
  GameplayFeedbackFlashTagComponentData,
  GameplayFeedbackFlashTagComponentName,
} from '@/Game/ecs-components/GameplayFeedbackFlashTag';
import {
  GameplayFeedbackManagerData,
  GameplayFeedbackManagerComponentName,
  type FeedbackFlashKind,
  type FeedbackFlashSlot,
} from '@/Game/ecs-components/GameplayFeedbackManager';
import {
  ScoreComponentData,
  ScoreComponentName,
} from '@/Game/ecs-components/Score';
import {
  gameplayFeedbackCopy,
  gameplayFeedbackTuning,
} from '@/config/gameplayFeedback';
import { computeTutorialOpacity } from '@/Game/session/beginGameplay';
import { getGameSession } from '@/Game/session/gameSessionQuery';
import { isGameplayJuiceActive } from '@/Game/feedback/gameplayFeedbackGates';
import {
  computeBonusFlashTransform,
  computeFlashTransform,
} from '@/Game/feedback/feedbackFlashAnim';
import {
  createDefaultNearMissState,
  pickNearMissCopyByClearance,
  rollNearMissBonus,
  updateNearMissState,
} from '@/Game/feedback/nearMissDetection';
import { GAMEPLAY_FLASH_COLORS } from '@/Game/feedback/gameplayFeedbackVisuals';
import { layoutGameplayFeedback } from '@/Game/ui/gameplayFeedbackLayout';
import { Skia, TextAlign } from '@shopify/react-native-skia';

const WORD_SLOT_COUNT = 2;

const findInactiveSlot = (
  slots: FeedbackFlashSlot[],
  kind: FeedbackFlashKind
): number => {
  'worklet';
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].active) continue;
    const isWordSlot = i < WORD_SLOT_COUNT;
    if (kind === 'word' && isWordSlot) return i;
    if (kind === 'bonus' && !isWordSlot) return i;
  }
  return -1;
};

const activateSlot = (
  slots: FeedbackFlashSlot[],
  index: number,
  kind: FeedbackFlashKind,
  text: string,
  startMs: number,
  anchorX: number,
  anchorY: number
): FeedbackFlashSlot[] => {
  'worklet';
  const next = slots.slice();
  const slot = next[index];
  if (!slot) return slots;
  next[index] = {
    ...slot,
    active: true,
    kind,
    text,
    startMs,
    anchorX,
    anchorY,
  };
  return next;
};

const deactivateSlot = (slots: FeedbackFlashSlot[], index: number): FeedbackFlashSlot[] => {
  'worklet';
  const next = slots.slice();
  const slot = next[index];
  if (!slot) return slots;
  next[index] = {
    ...slot,
    active: false,
    text: '',
    startMs: 0,
  };
  return next;
};

const deterministicRoll01 = (seed: number): number => {
  'worklet';
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const GameplayFeedbackSystem: System = {
  name: 'gameplayFeedbackSystem',
  requiredComponents: [GameplayFeedbackManagerComponentName],
  process: ({ entities, components, ecs, dimensions }) => {
    'worklet';

    const managerEntity = entities[0];
    const manager = components[GameplayFeedbackManagerComponentName].get(
      managerEntity
    ) as GameplayFeedbackManagerData | undefined;
    if (!manager) return;

    const session = getGameSession(components);
    const swimmerData = firstDataFromStore(
      components[SwimmerComponentName]
    ) as SwimmerComponentData | undefined;
    const isInInitialPhase = swimmerData?.isInInitialPhase ?? true;
    const nowMs = Date.now();
    const screenW = dimensions.value.width || 1;
    const screenH = dimensions.value.height || 1;
    const layout = layoutGameplayFeedback(screenW, screenH);
    const tutorialOpacity = session
      ? computeTutorialOpacity(session, nowMs)
      : 0;
    const juiceActive = isGameplayJuiceActive(
      session,
      isInInitialPhase,
      tutorialOpacity,
      gameplayFeedbackTuning.ENABLED
    );

    let slots = manager.slots;
    let nearMiss = manager.nearMiss;

    if (juiceActive && swimmerData) {
      const clearance01 = swimmerData.locomotion.clearance01 ?? 1;
      const nearResult = updateNearMissState(
        clearance01,
        gameplayFeedbackTuning.NEAR_PIN_CLEARANCE01,
        nearMiss,
        nowMs,
        gameplayFeedbackTuning.NEAR_MISS_COOLDOWN_MS,
        gameplayFeedbackTuning.NEAR_MISS_MAX_PER_RUN
      );
      nearMiss = nearResult.state;

      if (nearResult.fired) {
        const anchorX = swimmerData.x;
        const anchorY = swimmerData.y - layout.anchorAboveSwimmerPx;
        const rollSeed =
          nowMs * 0.001 + clearance01 * 100 + nearMiss.firesThisRun;
        const rollB = deterministicRoll01(rollSeed + 17.31);
        const word = pickNearMissCopyByClearance(
          clearance01,
          gameplayFeedbackTuning.CLOSE_CLEARANCE_BAND_MAX,
          gameplayFeedbackTuning.NEAR_PIN_CLEARANCE01,
          gameplayFeedbackCopy.NEAR_MISS,
          gameplayFeedbackCopy.NEAR_MISS_ALT
        );
        const bonus = rollNearMissBonus(
          gameplayFeedbackTuning.NEAR_MISS_BONUS_MIN,
          gameplayFeedbackTuning.NEAR_MISS_BONUS_MAX,
          rollB
        );

        const wordIdx = findInactiveSlot(slots, 'word');
        if (wordIdx >= 0) {
          slots = activateSlot(
            slots,
            wordIdx,
            'word',
            word,
            nowMs,
            anchorX,
            anchorY
          );
        }

        const bonusIdx = findInactiveSlot(slots, 'bonus');
        if (bonusIdx >= 0) {
          slots = activateSlot(
            slots,
            bonusIdx,
            'bonus',
            `+${bonus}`,
            nowMs,
            anchorX,
            anchorY
          );
        }

        const scoreEntities = ecs.getEntitiesWithComponents([ScoreComponentName]);
        for (let si = 0; si < scoreEntities.length; si++) {
          const scoreEntity = scoreEntities[si];
          ecs.updateComponent<ScoreComponentData>(
            scoreEntity,
            ScoreComponentName,
            (s) => {
              s.score += bonus;
              s.hud.popStartMs = nowMs;
            }
          );
        }
      }
    }

    const tagStore = components[GameplayFeedbackFlashTagComponentName];
    if (!tagStore) return;

    tagStore.forEach((entityId, tag) => {
    const flashTag = tag as GameplayFeedbackFlashTagComponentData;
    const slotIndex = flashTag.slotIndex;
    const slot = slots[slotIndex];
    const renderData = components[RenderComponentName]?.get(entityId) as
      | RenderComponentData
      | undefined;
    const textData = components[TextComponentName]?.get(entityId) as
      | TextComponentData
      | undefined;
    if (!renderData || !textData || !slot) return;

    const isBonus = flashTag.role === 'bonus';
    const transform =
      slot.active && slot.kind === flashTag.role
        ? isBonus
          ? computeBonusFlashTransform(
              slot.startMs,
              nowMs,
              slot.anchorX,
              slot.anchorY,
              gameplayFeedbackTuning.FLASH_DURATION_MS,
              layout.risePx,
              layout.bonusOffsetX,
              layout.bonusOffsetY
            )
          : computeFlashTransform(
              slot.startMs,
              nowMs,
              slot.anchorX,
              slot.anchorY,
              gameplayFeedbackTuning.FLASH_DURATION_MS,
              layout.risePx
            )
        : {
            x: 0,
            y: 0,
            opacity: 0,
            scale: 1,
            active: false,
          };

    if (slot.active && slot.kind === flashTag.role && !transform.active) {
      slots = deactivateSlot(slots, slotIndex);
    }

    const visible = transform.active && transform.opacity > 0.01;
    const w = flashTag.baseWidth * transform.scale;
    const h = flashTag.baseHeight * transform.scale;
    const posX = transform.x - w / 2;
    const posY = transform.y - h / 2;

    ecs.updateComponent<RenderComponentData>(entityId, RenderComponentName, (r) => {
      r.visible = visible;
      r.opacity = transform.opacity;
      r.position = { x: posX, y: posY };
      if (
        gameplayFeedbackTuning.SHOW_SPARK_RING &&
        flashTag.role === 'word' &&
        r.shape.type === ShapeTypes.Circle
      ) {
        const radius = layout.sparkRadius * transform.scale;
        r.shape = { type: ShapeTypes.Circle, radius };
        r.fillColor = GAMEPLAY_FLASH_COLORS.sparkFill;
        r.strokeColor = GAMEPLAY_FLASH_COLORS.sparkStroke;
        r.lineWidth = gameplayFeedbackTuning.SPARK_STROKE_WIDTH;
      }
      if (r.shape.type === ShapeTypes.Rectangle) {
        r.shape = {
          type: ShapeTypes.Rectangle,
          width: w,
          height: h,
        };
      }
      r.isDirty = true;
    });

    ecs.updateComponent<TextComponentData>(entityId, TextComponentName, (t) => {
      const line =
        slot.active && slot.kind === flashTag.role ? slot.text : '';
      if (t.text !== line) {
        t.text = line;
        t.isDirty = true;
      }
      t.opacity = transform.opacity;
      t.fontSize = layout.fontSize * transform.scale;
      t.color = Skia.Color(
        isBonus ? GAMEPLAY_FLASH_COLORS.bonusFill : GAMEPLAY_FLASH_COLORS.fill
      );
      t.strokeColor = GAMEPLAY_FLASH_COLORS.stroke;
      t.strokeWidth = gameplayFeedbackTuning.FLASH_STROKE_WIDTH;
      t.align = TextAlign.Center;
    });
    });

    const slotsChanged = slots !== manager.slots;
    const nearMissChanged = nearMiss !== manager.nearMiss;
    if (slotsChanged || nearMissChanged) {
      ecs.updateComponent<GameplayFeedbackManagerData>(
        managerEntity,
        GameplayFeedbackManagerComponentName,
        (m) => {
          m.nearMiss = nearMiss;
          m.slots = slots;
        }
      );
    }
  },
};

export const resetGameplayFeedbackManager = (
  manager: GameplayFeedbackManagerData
): void => {
  'worklet';
  manager.nearMiss = createDefaultNearMissState();
  for (let i = 0; i < manager.slots.length; i++) {
    manager.slots[i].active = false;
    manager.slots[i].text = '';
    manager.slots[i].startMs = 0;
  }
};
