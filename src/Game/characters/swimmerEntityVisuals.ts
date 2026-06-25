import type { ICharacterProfile } from './characterProfileTypes';
import type { IKinematicTelemetry } from './kinematicTelemetry';
import {
  createDeformationScale,
  updateProceduralDeformation,
  type DeformationState,
} from './proceduralDeformationEngine';
import type { DeformationScale } from './proceduralDeformationTypes';
import {
  ensureAccessoryState,
  notifySecondaryAccessoryPivotImpact,
  updateSecondaryAccessory,
} from './secondaryItemRuntime';
import type {
  SecondaryItemLayerSink,
  SecondaryItemPersistedState,
} from './secondaryItemTypes';
import type { VisualStrokePhase } from './visualStrokePhase';
import { visualPhaseToDeformationState } from './swimmerVisualLocomotion';
import { MovementState } from './characterMovementStates';

export type SwimmerEntityVisualResult = {
  scaleX: number;
  scaleY: number;
  accessoryState: SecondaryItemPersistedState | undefined;
};

export type SwimmerEntityVisualOptions = {
  crestMode?: boolean;
  crestLayerWidth?: number;
  crestLayerHeight?: number;
  crestAnchorXRatio?: number;
  crestAnchorYRatio?: number;
};

export const updateSwimmerEntityVisuals = (
  profile: ICharacterProfile,
  deformation: DeformationScale,
  accessoryState: SecondaryItemPersistedState | undefined,
  accessorySink: SecondaryItemLayerSink | null,
  dt: number,
  telemetry: IKinematicTelemetry,
  idleOscillationPhase: number,
  pivotImpactSpeed: number | null,
  visualPhase: VisualStrokePhase,
  isPinned: boolean,
  options: SwimmerEntityVisualOptions = {}
): SwimmerEntityVisualResult => {
  'worklet';
  const deformationState: DeformationState = visualPhaseToDeformationState(
    visualPhase,
    telemetry.state,
    isPinned
  );

  const deformationResult = updateProceduralDeformation(
    deformation,
    deformationState,
    dt,
    idleOscillationPhase
  );

  let nextAccessoryState = ensureAccessoryState(
    profile.secondaryItemType,
    accessoryState
  );

  const accessoryArgs = {
    velocityX: telemetry.velocityX,
    parentAngleDeg: telemetry.currentAngle,
    scaleX: deformationResult.scaleX,
    scaleY: deformationResult.scaleY,
    movementState:
      deformationState === 'PINNED'
        ? MovementState.PIVOT_BRAKE
        : deformationState,
    dt,
    crestLayerHeight: options.crestLayerHeight,
    crestLayerWidth: options.crestLayerWidth,
    crestAnchorXRatio: options.crestAnchorXRatio,
    crestAnchorYRatio: options.crestAnchorYRatio,
  };

  nextAccessoryState = updateSecondaryAccessory(
    profile.secondaryItemType,
    profile.secondaryItemWeight,
    nextAccessoryState,
    accessoryArgs,
    accessorySink
  );

  if (pivotImpactSpeed !== null) {
    nextAccessoryState = notifySecondaryAccessoryPivotImpact(
      profile.secondaryItemType,
      nextAccessoryState,
      pivotImpactSpeed,
      options.crestMode === true
    );
    nextAccessoryState = updateSecondaryAccessory(
      profile.secondaryItemType,
      profile.secondaryItemWeight,
      nextAccessoryState,
      {
        ...accessoryArgs,
        dt: 0,
        movementState: MovementState.PIVOT_BRAKE,
      },
      accessorySink
    );
  }

  return {
    scaleX: deformationResult.scaleX,
    scaleY: deformationResult.scaleY,
    accessoryState: nextAccessoryState,
  };
};

export const createSwimmerDeformationScale = (
  scaleX: number,
  scaleY: number
): DeformationScale => {
  'worklet';
  return createDeformationScale(scaleX, scaleY);
};
