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
  firstDataFromStore,
  firstEntityFromStore,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import { SwimmerComponentName, SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import {
  GameplayFeedbackFlashTagComponentName,
  type GameplayFeedbackFlashTagComponentData,
} from '@/Game/ecs-components/GameplayFeedbackFlashTag';
import {
  GameplayFeedbackManagerData,
  GameplayFeedbackManagerComponentName,
  type FeedbackFlashSlot,
} from '@/Game/ecs-components/GameplayFeedbackManager';
import {
  ScoreComponentData,
  ScoreComponentName,
} from '@/Game/ecs-components/Score';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import {
  ObstacleRowComponentName,
  type ObstacleRowComponentData,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  ObstaclesManagerComponentName,
  type ObstaclesManagerComponentData,
} from '@/Game/ecs-components/ObstaclesManager';
import { gameplayFeedbackTuning } from '@/config/gameplayFeedback';
import { skillFeedbackTuning } from '@/config/skillFeedback';
import { gapDifficulty01FromTotalRows } from '@/config/gapDifficultyRamp';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { LAYOUT_CONSTANTS } from '@/Layout';
import { computeTutorialOpacity } from '@/Game/session/beginGameplay';
import { getGameSession } from '@/Game/session/gameSessionQuery';
import { isGameplayJuiceActive } from '@/Game/feedback/gameplayFeedbackGates';
import {
  computeBonusFlashTransform,
  computeFlashTransform,
} from '@/Game/feedback/feedbackFlashAnim';
import { updateCeilingDodgeDetection } from '@/Game/feedback/ceilingDodgeDetection';
import { detectSnapTransfer } from '@/Game/feedback/snapTransferDetection';
import { detectSteerPraise } from '@/Game/feedback/steerPraiseDetection';
import { updateTapCoachDetection } from '@/Game/feedback/tapCoachDetection';
import { computePraiseBonus } from '@/Game/feedback/praiseBonus';
import { routeSkillPraiseEvents } from '@/Game/feedback/praiseRouter';
import {
  deterministicRoll01,
  emitPraiseToSlots,
} from '@/Game/feedback/praiseEmitter';
import {
  appendRowCrossSnapshot,
  shouldSkipSteerOnIdenticalGaps,
} from '@/Game/feedback/rowCrossHistory';
import {
  buildRowCrossSnapshot,
  normalizeSpeed01,
  swimmerWorldXToColumn,
} from '@/Game/feedback/rowCrossEval';
import { GAMEPLAY_FLASH_COLORS } from '@/Game/feedback/gameplayFeedbackVisuals';
import { layoutGameplayFeedback } from '@/Game/ui/gameplayFeedbackLayout';
import {
  createDefaultSkillFeedbackState,
  type SkillPraiseEvent,
} from '@/Game/feedback/skillFeedbackTypes';
import { Skia, TextAlign } from '@shopify/react-native-skia';

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
      skillFeedbackTuning.ENABLED
    );

    let slots = manager.slots;
    let skillFeedback = manager.skillFeedback;
    const wordSlotCount = gameplayFeedbackTuning.WORD_SLOT_COUNT;

    if (juiceActive && swimmerData) {
      const waterData = firstDataFromStore(
        components[WaterComponentName]
      ) as WaterComponentData | undefined;
      const managerData = firstDataFromStore(
        components[ObstaclesManagerComponentName]
      ) as ObstaclesManagerComponentData | undefined;
      const totalRows = managerData?.totalRowsGenerated ?? 0;
      const difficulty01 = gapDifficulty01FromTotalRows(totalRows);
      const raisingSpeed = waterData?.raisingSpeed ?? 0;
      const speedNorm = normalizeSpeed01(
        raisingSpeed,
        skillFeedbackTuning.speedNormMax
      );
      const clearance01 = swimmerData.locomotion.clearance01 ?? 1;
      const anchorX = swimmerData.x;
      const anchorY = swimmerData.y - layout.anchorAboveSwimmerPx;
      const columnCount = LAYOUT_CONSTANTS.COLUMNS;
      const columnWidth =
        swimmerData.containerWidth / Math.max(1, columnCount);
      const minEscapeTravelPx =
        columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_MIN_TAP_TRAVEL_COLUMN_FRACTION;

      const candidates: SkillPraiseEvent[] = [];

      const tapResult = updateTapCoachDetection({
        isPinned: swimmerData.isPinnedFromAbove === true,
        swimmerX: swimmerData.x,
        columnWidth,
        state: skillFeedback.tapCoach,
        nowMs,
        anchorX,
        anchorY,
        tuning: skillFeedbackTuning,
        minEscapeTravelPx,
      });
      skillFeedback = {
        ...skillFeedback,
        tapCoach: tapResult.state,
      };
      for (let i = 0; i < tapResult.events.length; i++) {
        candidates.push(tapResult.events[i]);
      }

      const ceilingResult = updateCeilingDodgeDetection({
        brushing: swimmerData.ceilingBrushThisFrame === true,
        isPinned: swimmerData.isPinnedFromAbove === true,
        state: skillFeedback.ceilingDodge,
        nowMs,
        speedNorm,
        difficulty01,
        rowHistory: skillFeedback.rowHistory,
        anchorX,
        anchorY,
        tuning: skillFeedbackTuning,
      });
      skillFeedback = {
        ...skillFeedback,
        ceilingDodge: ceilingResult.state,
      };
      if (ceilingResult.event) {
        candidates.push(ceilingResult.event);
      }

      const centerRowEntity = waterData?.centerRowEntity;
      if (
        typeof centerRowEntity === 'number' &&
        centerRowEntity !== skillFeedback.lastCenterRowEntity
      ) {
        const rowData = components[ObstacleRowComponentName]?.get(
          centerRowEntity
        ) as ObstacleRowComponentData | undefined;

        if (rowData?.gaps) {
          const swimmerCol = swimmerWorldXToColumn(
            swimmerData.x,
            swimmerData.containerCenterX,
            swimmerData.containerWidth,
            columnCount
          );
          const snapshot = buildRowCrossSnapshot(
            rowData.gaps,
            columnCount,
            swimmerCol,
            rowData.spawnDiagBranchKey ?? '',
            nowMs,
            swimmerData.isPinnedFromAbove === true,
            swimmerData.isSideBlocked === true,
            skillFeedbackTuning
          );

          const skipSteer = shouldSkipSteerOnIdenticalGaps(
            skillFeedback.rowHistory,
            snapshot.topology.gaps,
            skillFeedbackTuning.SKIP_STEER_ON_IDENTICAL_GAPS
          );

          if (!skipSteer) {
            const snapEvent = detectSnapTransfer({
              history: skillFeedback.rowHistory,
              current: snapshot,
              speedNorm,
              difficulty01,
              anchorX,
              anchorY,
              tuning: skillFeedbackTuning,
            });
            if (snapEvent) {
              candidates.push(snapEvent);
            }

            const steerEvent = detectSteerPraise({
              history: skillFeedback.rowHistory,
              current: snapshot,
              speedNorm,
              difficulty01,
              anchorX,
              anchorY,
              tuning: skillFeedbackTuning,
            });
            if (steerEvent) {
              candidates.push(steerEvent);
            }

            skillFeedback = {
              ...skillFeedback,
              rowHistory: appendRowCrossSnapshot(
                skillFeedback.rowHistory,
                snapshot,
                skillFeedbackTuning.HISTORY_BUFFER_SIZE
              ),
            };
          }

          skillFeedback = {
            ...skillFeedback,
            lastCenterRowEntity: centerRowEntity,
          };
        }
      }

      const routed = routeSkillPraiseEvents({
        candidates,
        state: skillFeedback,
        nowMs,
        tuning: skillFeedbackTuning,
      });
      skillFeedback = routed.state;

      if (routed.events.length > 0) {
        const bonuses: number[] = [];
        let totalBonus = 0;
        for (let i = 0; i < routed.events.length; i++) {
          const event = routed.events[i];
          const roll = deterministicRoll01(
            nowMs * 0.001 + i * 17.31 + clearance01 * 100
          );
          const bonus = computePraiseBonus(
            event,
            clearance01,
            raisingSpeed,
            difficulty01,
            skillFeedbackTuning,
            roll
          );
          bonuses.push(bonus);
          totalBonus += bonus;
        }

        slots = emitPraiseToSlots(
          slots,
          routed.events,
          bonuses,
          nowMs,
          wordSlotCount
        );

        if (totalBonus > 0) {
          const scoreEntities = ecs.getEntitiesWithComponents([ScoreComponentName]);
          for (let si = 0; si < scoreEntities.length; si++) {
            const scoreEntity = scoreEntities[si];
            ecs.updateComponent<ScoreComponentData>(
              scoreEntity,
              ScoreComponentName,
              (s) => {
                s.score += totalBonus;
                s.hud.popStartMs = nowMs;
              }
            );
          }
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
    const skillChanged = skillFeedback !== manager.skillFeedback;
    if (slotsChanged || skillChanged) {
      ecs.updateComponent<GameplayFeedbackManagerData>(
        managerEntity,
        GameplayFeedbackManagerComponentName,
        (m) => {
          m.skillFeedback = skillFeedback;
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
  manager.skillFeedback = createDefaultSkillFeedbackState();
  for (let i = 0; i < manager.slots.length; i++) {
    manager.slots[i].active = false;
    manager.slots[i].text = '';
    manager.slots[i].startMs = 0;
  }
};
