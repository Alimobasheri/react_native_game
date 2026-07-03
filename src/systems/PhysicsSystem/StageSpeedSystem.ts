import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore, firstEntityFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import {
  ObstaclesManagerComponentName,
  type ObstaclesManagerComponentData,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import { computeStageConstantSpeed, computeRelaxTargetSpeed } from '@/config/stageProgression';
import { pacingPhaseAtTotalRows } from '@/Game/path/pacingDirector';
import {
  getGameSessionEntity,
  getPacingRunContextFromComponents,
  isGameOverPhase,
  isStartReady,
} from '@/Game/session/gameSessionQuery';
import {
  computeRelaxAccelStep,
  isReleaseRelaxPhase,
  shouldHoldStageConstantSpeed,
} from '@/systems/PhysicsSystem/stageSpeed';

/**
 * Stage water speed: constant within a directed-path loop; RELEASE relax accel;
 * +STAGE_SPEED_INCREMENT after each full cycle (RELEASE→FLOW).
 */
export const StageSpeedSystem: System = {
  requiredComponents: [WaterComponentName, ObstaclesManagerComponentName],
  process: ({ components, ecs, deltaTime }) => {
    'worklet';

    const waterEntity = firstEntityFromStore(components[WaterComponentName]);
    const sessionEntity = getGameSessionEntity(components);
    if (waterEntity === undefined || typeof sessionEntity !== 'number') {
      return;
    }

    const waterData = components[WaterComponentName].get(waterEntity) as
      | WaterComponentData
      | undefined;
    const session = components[GameSessionComponentName]?.get(
      sessionEntity
    ) as GameSessionComponentData | undefined;
    if (!waterData || !session) {
      return;
    }

    if (isStartReady(session) || isGameOverPhase(session)) {
      return;
    }

    const nowMs = Date.now();
    if (!shouldHoldStageConstantSpeed(session, nowMs)) {
      return;
    }

    const managerData = firstDataFromStore(
      components[ObstaclesManagerComponentName]
    ) as ObstaclesManagerComponentData | undefined;
    const totalRows = managerData?.totalRowsGenerated ?? 0;
    const pacingCtx = getPacingRunContextFromComponents(components);
    const phase = pacingPhaseAtTotalRows(totalRows, pacingCtx);
    const prevPhase = waterData.lastPacingPhaseForStage;
    const deltaSeconds = deltaTime / 1000;
    const baseSpeed = session.gameplayRaisingSpeed;
    const stageIndex = session.stageIndex ?? 1;
    const constantSpeed = computeStageConstantSpeed(baseSpeed, stageIndex);

    let nextStageIndex = stageIndex;
    let overlayKind = session.stageOverlayKind ?? 'none';
    let overlayStartMs = session.stageOverlayStartMs ?? 0;
    let nextRaisingSpeed = waterData.raisingSpeed ?? constantSpeed;
    let nextBaseSpeed = waterData.baseSpeed ?? constantSpeed;

    if (prevPhase === 'RELEASE' && phase === 'FLOW') {
      nextStageIndex = stageIndex + 1;
      const snapped = computeStageConstantSpeed(baseSpeed, nextStageIndex);
      nextRaisingSpeed = snapped;
      nextBaseSpeed = snapped;
      overlayKind = 'next';
      overlayStartMs = nowMs;
    } else if (isReleaseRelaxPhase(phase)) {
      const relaxTarget = computeRelaxTargetSpeed(baseSpeed, stageIndex);
      const step = computeRelaxAccelStep(deltaSeconds);
      const current = waterData.raisingSpeed ?? constantSpeed;
      nextRaisingSpeed = Math.min(relaxTarget, current + step);
      nextBaseSpeed = nextRaisingSpeed;
      if (prevPhase !== 'RELEASE' && phase === 'RELEASE') {
        overlayKind = 'done';
        overlayStartMs = nowMs;
      }
    } else {
      nextRaisingSpeed = constantSpeed;
      nextBaseSpeed = constantSpeed;
    }

    const sessionChanged =
      nextStageIndex !== stageIndex ||
      overlayKind !== (session.stageOverlayKind ?? 'none') ||
      overlayStartMs !== (session.stageOverlayStartMs ?? 0);

    if (sessionChanged) {
      ecs.updateComponent<GameSessionComponentData>(
        sessionEntity,
        GameSessionComponentName,
        (s) => {
          'worklet';
          s.stageIndex = nextStageIndex;
          s.stageOverlayKind = overlayKind;
          s.stageOverlayStartMs = overlayStartMs;
        }
      );
    }

    ecs.updateComponent<WaterComponentData>(
      waterEntity,
      WaterComponentName,
      (water) => {
        'worklet';
        water.raisingSpeed = nextRaisingSpeed;
        water.baseSpeed = nextBaseSpeed;
        water.lastPacingPhaseForStage = phase;
        water.stageConstantSpeed = computeStageConstantSpeed(
          baseSpeed,
          nextStageIndex
        );
      }
    );
  },
};
