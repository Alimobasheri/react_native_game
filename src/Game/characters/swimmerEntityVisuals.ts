import type { ICharacterProfile } from './characterProfileTypes';
import type { IKinematicTelemetry } from './kinematicTelemetry';
import {
  createDeformationScale,
  updateProceduralDeformation,
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

export type SwimmerEntityVisualResult = {
  scaleX: number;
  scaleY: number;
  accessoryState: SecondaryItemPersistedState | undefined;
};

export const updateSwimmerEntityVisuals = (
  profile: ICharacterProfile,
  deformation: DeformationScale,
  accessoryState: SecondaryItemPersistedState | undefined,
  accessorySink: SecondaryItemLayerSink | null,
  dt: number,
  telemetry: IKinematicTelemetry,
  idleOscillationPhase: number,
  pivotImpactSpeed: number | null
): SwimmerEntityVisualResult => {
  'worklet';
  const deformationResult = updateProceduralDeformation(
    deformation,
    telemetry.state,
    telemetry.velocityX,
    telemetry.currentTier,
    dt,
    idleOscillationPhase
  );

  let nextAccessoryState = ensureAccessoryState(
    profile.secondaryItemType,
    accessoryState
  );

  nextAccessoryState = updateSecondaryAccessory(
    profile.secondaryItemType,
    profile.secondaryItemWeight,
    nextAccessoryState,
    {
      velocityX: telemetry.velocityX,
      parentAngleDeg: telemetry.currentAngle,
      scaleX: deformationResult.scaleX,
      scaleY: deformationResult.scaleY,
      movementState: telemetry.state,
      dt,
    },
    accessorySink
  );

  if (pivotImpactSpeed !== null) {
    nextAccessoryState = notifySecondaryAccessoryPivotImpact(
      profile.secondaryItemType,
      nextAccessoryState,
      pivotImpactSpeed
    );
    nextAccessoryState = updateSecondaryAccessory(
      profile.secondaryItemType,
      profile.secondaryItemWeight,
      nextAccessoryState,
      {
        velocityX: telemetry.velocityX,
        parentAngleDeg: telemetry.currentAngle,
        scaleX: deformationResult.scaleX,
        scaleY: deformationResult.scaleY,
        movementState: telemetry.state,
        dt: 0,
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
