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
import { pacingPhaseAtTotalRows } from '@/Game/path/pacingDirector';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { LAYOUT_CONSTANTS } from '@/Layout';
import { computeTutorialOpacity } from '@/Game/session/beginGameplay';
import { getGameSession } from '@/Game/session/gameSessionQuery';
import { isGameplayJuiceActive } from '@/Game/feedback/gameplayFeedbackGates';
import {
  computeBonusFlashTransform,
  computeFlashTransform,
} from '@/Game/feedback/feedbackFlashAnim';
import { updateNearMissDetection } from '@/Game/feedback/nearMissDetection';
import { detectSnapTransfer } from '@/Game/feedback/snapTransferDetection';
import { detectSteerPraise, evaluateShiftCommit } from '@/Game/feedback/steerPraiseDetection';
import { resetPassageFlowSampler } from '@/Game/feedback/passageFlowScoring';
import { updateTapCoachDetection } from '@/Game/feedback/tapCoachDetection';
import { updateZigzagTapDetection } from '@/Game/feedback/zigzagTapDetection';
import { computePraiseBonus } from '@/Game/feedback/praiseBonus';
import { routeSkillPraiseEvents } from '@/Game/feedback/praiseRouter';
import {
  resetContactWindow,
  updateContactWindow,
} from '@/Game/feedback/hygieneScoring';
import { resolveSkillGates } from '@/Game/feedback/skillSurvivalGates';
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
  swimmerWorldXToColumnFrac,
} from '@/Game/feedback/rowCrossEval';
import { GAMEPLAY_FLASH_COLORS } from '@/Game/feedback/gameplayFeedbackVisuals';
import { layoutGameplayFeedback } from '@/Game/ui/gameplayFeedbackLayout';
import {
  createDefaultSkillFeedbackState,
  type SkillPraiseEvent,
} from '@/Game/feedback/skillFeedbackTypes';
import {
  appendDiagRing,
  compactCandidatesFromEvents,
  compactContact,
  compactPassageFlow,
  compactStitch,
  computeRowHygiene01,
  copyStringsFromEvents,
  skillFeedbackDiagTuning,
  type SkillFeedbackDiagEntry,
} from '@/Game/debug/skillFeedbackDiag';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { gapDifficulty01FromTotalRows } from '@/config/gapDifficultyRamp';

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
    stackIndex: 0,
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
    let diagRing = manager.diagRing ?? [];
    const wordSlotCount = gameplayFeedbackTuning.WORD_SLOT_COUNT;
    const diagEnabled = skillFeedbackDiagTuning.ENABLED;
    let rowCrossDraft: Omit<
      Extract<SkillFeedbackDiagEntry, { kind: 'row_cross' }>,
      'kind' | 'candidates' | 'routed' | 'dropped'
    > | null = null;
    let shiftCommitReject:
      | import('@/Game/feedback/skillFeedbackTypes').ShiftCommitRejectReason
      | undefined;

    if (juiceActive && swimmerData) {
      const waterData = firstDataFromStore(
        components[WaterComponentName]
      ) as WaterComponentData | undefined;
      const managerData = firstDataFromStore(
        components[ObstaclesManagerComponentName]
      ) as ObstaclesManagerComponentData | undefined;
      const totalRows = managerData?.totalRowsGenerated ?? 0;
      const pacingPhase = pacingPhaseAtTotalRows(totalRows);
      const difficulty01 = gapDifficulty01FromTotalRows(totalRows);
      const raisingSpeed = waterData?.raisingSpeed ?? 0;
      const baseSpeed = waterData?.baseSpeed ?? 0;
      const stageIndex = session?.stageIndex ?? 1;
      const stageConstantSpeed = waterData?.stageConstantSpeed;
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

      const locomotion = swimmerData.locomotion;
      const lastTapTimeMs = locomotion.lastTapTimeMs;
      const lastTapDirection = locomotion.lastTapDirection;

      const candidates: SkillPraiseEvent[] = [];

      skillFeedback = {
        ...skillFeedback,
        contactWindow: updateContactWindow(skillFeedback.contactWindow, {
          sideBlocked: swimmerData.isSideBlocked === true,
          ceilingBrush: swimmerData.ceilingBrushThisFrame === true,
          colliding: swimmerData.isCollidingWithObstacle === true,
          pinned: swimmerData.isPinnedFromAbove === true,
          clearance01,
          movementBlocked: swimmerData.movementBlockedThisFrame === true,
          swimmerColFrac: swimmerWorldXToColumnFrac(
            swimmerData.x,
            swimmerData.containerCenterX,
            swimmerData.containerWidth,
            columnCount
          ),
        }),
      };

      const gates = resolveSkillGates(
        difficulty01,
        speedNorm,
        skillFeedbackTuning
      );

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
        speedNorm,
        difficulty01,
      });
      skillFeedback = {
        ...skillFeedback,
        tapCoach: tapResult.state,
      };
      for (let i = 0; i < tapResult.events.length; i++) {
        candidates.push(tapResult.events[i]);
      }

      const nearMissResult = updateNearMissDetection({
        ceilingBrush: swimmerData.ceilingBrushThisFrame === true,
        isPinned: swimmerData.isPinnedFromAbove === true,
        stitchSampler: skillFeedback.contactWindow.stitchSampler,
        lastTapTimeMs,
        lastTapDirection,
        state: skillFeedback.nearMiss,
        nowMs,
        speedNorm,
        difficulty01,
        anchorX,
        anchorY,
        tuning: skillFeedbackTuning,
      });
      skillFeedback = {
        ...skillFeedback,
        nearMiss: nearMissResult.state,
      };
      if (nearMissResult.event) {
        candidates.push(nearMissResult.event);
      }

      const zigzagResult = updateZigzagTapDetection({
        lastTapTimeMs,
        lastTapDirection,
        state: skillFeedback.zigzagTap,
        nowMs,
        speedNorm,
        difficulty01,
        anchorX,
        anchorY,
        tuning: skillFeedbackTuning,
      });
      skillFeedback = {
        ...skillFeedback,
        zigzagTap: zigzagResult.state,
      };
      if (zigzagResult.event) {
        candidates.push(zigzagResult.event);
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
          const swimmerColFrac = swimmerWorldXToColumnFrac(
            swimmerData.x,
            swimmerData.containerCenterX,
            swimmerData.containerWidth,
            columnCount
          );
          const snapshot = buildRowCrossSnapshot(
            rowData.gaps,
            columnCount,
            swimmerCol,
            swimmerColFrac,
            rowData.spawnDiagBranchKey ?? '',
            nowMs,
            swimmerData.isPinnedFromAbove === true,
            swimmerData.isSideBlocked === true,
            skillFeedbackTuning,
            gates,
            skillFeedback.rowHistory,
            {
              ceilingBrush: swimmerData.ceilingBrushThisFrame === true,
              colliding: swimmerData.isCollidingWithObstacle === true,
              clearance01,
            }
          );

          const skipSteer = shouldSkipSteerOnIdenticalGaps(
            skillFeedback.rowHistory,
            snapshot.rawGaps,
            skillFeedbackTuning.SKIP_STEER_ON_IDENTICAL_GAPS
          );

          if (diagEnabled) {
            rowCrossDraft = {
              tMs: nowMs,
              totalRows,
              difficulty01,
              speedNorm,
              raisingSpeed,
              baseSpeed,
              pacingPhase,
              stageIndex,
              stageConstantSpeed,
              branchKey: snapshot.branchKey,
              gaps: snapshot.rawGaps.slice(),
              swimmerCol,
              swimmerColFrac,
              crossQualified: snapshot.crossQualified,
              cleanCross: snapshot.cleanCross,
              contact: compactContact(snapshot.contact),
              hygiene01: computeRowHygiene01(
                skillFeedback.rowHistory,
                skillFeedback.contactWindow.stitchSampler
              ),
              stitch: compactStitch(skillFeedback.contactWindow.stitchSampler),
              passageFlow: compactPassageFlow(
                skillFeedback.contactWindow.passageFlow
              ),
              skipSteerIdenticalGaps: skipSteer,
            };
          }

          const passageSampler = skillFeedback.contactWindow.passageFlow;

          if (!skipSteer) {
            const snapEvent = detectSnapTransfer({
              history: skillFeedback.rowHistory,
              current: snapshot,
              speedNorm,
              difficulty01,
              anchorX,
              anchorY,
              tuning: skillFeedbackTuning,
              stitchSampler: skillFeedback.contactWindow.stitchSampler,
            });
            if (snapEvent) {
              candidates.push(snapEvent);
            }

            const steerCtx = {
              history: skillFeedback.rowHistory,
              current: snapshot,
              speedNorm,
              difficulty01,
              anchorX,
              anchorY,
              tuning: skillFeedbackTuning,
              stitchSampler: skillFeedback.contactWindow.stitchSampler,
              passageSampler,
              gates,
            };
            const shiftEval = evaluateShiftCommit(steerCtx);
            if (diagEnabled) {
              shiftCommitReject = shiftEval.rejectReason ?? undefined;
            }
            const steerEvent = detectSteerPraise(steerCtx);
            if (steerEvent) {
              candidates.push(steerEvent);
            }
          } else if (diagEnabled) {
            shiftCommitReject = undefined;
          }

          skillFeedback = {
            ...skillFeedback,
            contactWindow: {
              ...skillFeedback.contactWindow,
              passageFlow: resetPassageFlowSampler(),
            },
            rowHistory: appendRowCrossSnapshot(
              skillFeedback.rowHistory,
              snapshot,
              skillFeedbackTuning.HISTORY_BUFFER_SIZE
            ),
          };

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
        steerCooldownMsOverride: gates.steerCooldownMs,
      });
      skillFeedback = routed.state;

      if (diagEnabled && rowCrossDraft) {
        const compactCandidates = compactCandidatesFromEvents(candidates);
        const compactRouted = compactCandidatesFromEvents(routed.events);
        diagRing = appendDiagRing(diagRing, {
          kind: 'row_cross',
          tMs: rowCrossDraft.tMs,
          totalRows: rowCrossDraft.totalRows,
          difficulty01: rowCrossDraft.difficulty01,
          speedNorm: rowCrossDraft.speedNorm,
          raisingSpeed: rowCrossDraft.raisingSpeed,
          baseSpeed: rowCrossDraft.baseSpeed,
          pacingPhase: rowCrossDraft.pacingPhase,
          stageIndex: rowCrossDraft.stageIndex,
          stageConstantSpeed: rowCrossDraft.stageConstantSpeed,
          branchKey: rowCrossDraft.branchKey,
          gaps: rowCrossDraft.gaps,
          swimmerCol: rowCrossDraft.swimmerCol,
          swimmerColFrac: rowCrossDraft.swimmerColFrac,
          crossQualified: rowCrossDraft.crossQualified,
          cleanCross: rowCrossDraft.cleanCross,
          contact: rowCrossDraft.contact,
          hygiene01: rowCrossDraft.hygiene01,
          stitch: rowCrossDraft.stitch,
          passageFlow: rowCrossDraft.passageFlow,
          skipSteerIdenticalGaps: rowCrossDraft.skipSteerIdenticalGaps,
          shiftCommitReject,
          candidates: compactCandidates,
          routed: compactRouted,
          dropped: routed.dropped,
        });
      } else if (diagEnabled && candidates.length > 0) {
        const compactCandidates = compactCandidatesFromEvents(candidates);
        const compactRouted = compactCandidatesFromEvents(routed.events);
        diagRing = appendDiagRing(diagRing, {
          kind: 'praise_frame',
          tMs: nowMs,
          pinned: swimmerData.isPinnedFromAbove === true,
          ceilingBrush: swimmerData.ceilingBrushThisFrame === true,
          candidates: compactCandidates,
          routed: compactRouted,
          dropped: routed.dropped,
        });
      }

      if (
        routed.events.some(
          (e) =>
            e.familyId === 'steer_clean' || e.familyId === 'snap_transfer'
        )
      ) {
        skillFeedback = {
          ...skillFeedback,
          contactWindow: resetContactWindow(),
        };
      }

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
            roll,
            event.hygiene01 ?? 1
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

        if (diagEnabled) {
          diagRing = appendDiagRing(diagRing, {
            kind: 'fired',
            tMs: nowMs,
            copies: copyStringsFromEvents(routed.events),
            bonuses,
            totalBonus,
          });
        }

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
              layout.bonusOffsetY,
              slot.stackIndex,
              layout.stackGapPx
            )
            : computeFlashTransform(
              slot.startMs,
              nowMs,
              slot.anchorX,
              slot.anchorY,
              gameplayFeedbackTuning.FLASH_DURATION_MS,
              layout.risePx,
              slot.stackIndex,
              layout.stackGapPx
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
    const diagChanged = diagRing !== manager.diagRing;
    if (slotsChanged || skillChanged || diagChanged) {
      ecs.updateComponent<GameplayFeedbackManagerData>(
        managerEntity,
        GameplayFeedbackManagerComponentName,
        (m) => {
          m.skillFeedback = skillFeedback;
          m.slots = slots;
          m.diagRing = diagRing;
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
  manager.diagRing = [];
  for (let i = 0; i < manager.slots.length; i++) {
    manager.slots[i].active = false;
    manager.slots[i].text = '';
    manager.slots[i].startMs = 0;
    manager.slots[i].stackIndex = 0;
  }
};
