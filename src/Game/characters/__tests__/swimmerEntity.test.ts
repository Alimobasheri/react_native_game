import { MovementState } from '../characterMovementStates';
import { GIGGLE_CRYSTAL_PROFILE } from '../characterProfiles';
import {
  createLaggingSpringAccessoryState,
  notifyLaggingSpringPivotImpact,
  updateLaggingSpringAccessory,
} from '../accessories/laggingSpringGoggles';
import {
  createSwimmerDeformationScale,
  updateSwimmerEntityVisuals,
} from '../swimmerEntityVisuals';
import { buildKinematicTelemetry } from '../kinematicTelemetry';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';
import type { SecondaryItemLayerSink } from '../secondaryItemTypes';
import '../characterProfiles';

const glideTelemetry = (velocityX = 180) =>
  buildKinematicTelemetry(
    {
      ...createDefaultSwimmerLocomotion(),
      movementState: MovementState.GLIDE,
      currentTier: 2,
    },
    velocityX
  );

describe('updateSwimmerEntityVisuals', () => {
  it('returns volume-conserved deformation scales', () => {
    const result = updateSwimmerEntityVisuals(
      GIGGLE_CRYSTAL_PROFILE,
      createSwimmerDeformationScale(1, 1),
      undefined,
      null,
      1 / 60,
      glideTelemetry(),
      0,
      null
    );

    expect(result.scaleX).toBeGreaterThan(0);
    expect(result.scaleY).toBeGreaterThan(0);
    expect(result.scaleX * result.scaleY).toBeCloseTo(1, 2);
  });

  it('notifies accessories of pivot impact only when pivotImpactSpeed is provided', () => {
    let pivotImpactCount = 0;
    let accessoryState = createLaggingSpringAccessoryState();
    const sink: SecondaryItemLayerSink = {
      setLocalTransform: () => {},
    };

    const pivotTelemetry = buildKinematicTelemetry(
      {
        ...createDefaultSwimmerLocomotion(),
        movementState: MovementState.PIVOT_BRAKE,
      },
      -150
    );

    const runVisual = (pivotImpactSpeed: number | null) => {
      const result = updateSwimmerEntityVisuals(
        GIGGLE_CRYSTAL_PROFILE,
        createSwimmerDeformationScale(1, 1),
        accessoryState,
        sink,
        1 / 60,
        pivotTelemetry,
        0,
        pivotImpactSpeed
      );
      accessoryState = result.accessoryState!;
      if (
        pivotImpactSpeed !== null &&
        accessoryState.kind === 'LaggingSpring' &&
        accessoryState.springVelocityX !== 0
      ) {
        pivotImpactCount += 1;
      }
    };

    runVisual(null);
    expect(pivotImpactCount).toBe(0);

    runVisual(150);
    expect(pivotImpactCount).toBe(1);
    if (accessoryState.kind === 'LaggingSpring') {
      expect(accessoryState.springVelocityX).toBeLessThan(0);
    }
  });

  it('hydrates accessory simulation state between visual passes', () => {
    let accessoryState = createLaggingSpringAccessoryState();
    const sink: SecondaryItemLayerSink = {
      setLocalTransform: () => {},
    };

    for (let i = 0; i < 60; i++) {
      const result = updateSwimmerEntityVisuals(
        GIGGLE_CRYSTAL_PROFILE,
        createSwimmerDeformationScale(1, 1),
        accessoryState,
        sink,
        1 / 60,
        glideTelemetry(250),
        0,
        null
      );
      accessoryState = result.accessoryState!;
    }

    expect(accessoryState?.kind).toBe('LaggingSpring');
    if (accessoryState.kind !== 'LaggingSpring') {
      return;
    }

    const restored = updateLaggingSpringAccessory(
      createLaggingSpringAccessoryState(),
      GIGGLE_CRYSTAL_PROFILE.secondaryItemWeight,
      250,
      0,
      null
    );
    expect(restored.localOffsetX).not.toBe(accessoryState.localOffsetX);

    const whiplashState = notifyLaggingSpringPivotImpact(accessoryState, 150);
    expect(whiplashState.springVelocityX).toBeLessThan(
      accessoryState.springVelocityX
    );
  });
});
