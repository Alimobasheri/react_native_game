import { MovementState } from '../characterMovementStates';
import { GIGGLE_CRYSTAL_PROFILE } from '../characterProfiles';
import {
  getSwimmerKinematicsTelemetry,
  swimmerKinematicsOnTap,
  swimmerKinematicsUpdate,
  type PivotSplashHandler,
} from '../swimmerKinematicsController';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';
import { swimmerKinematicsTuning } from '@/config/swimmerKinematicsTuning';
import type { SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import '../characterProfiles';

const profile = GIGGLE_CRYSTAL_PROFILE;

const tierOneImpulse =
  (profile.baseStrikeForce * profile.comboForceMultipliers[0]) / profile.mass;

type KinematicsHarness = {
  locomotion: SwimmerLocomotionData;
  velocityX: number;
  onPivotSplash: PivotSplashHandler | null;
};

const createHarness = (seed?: Partial<SwimmerLocomotionData>): KinematicsHarness => ({
  locomotion: { ...createDefaultSwimmerLocomotion(), ...seed },
  velocityX: 0,
  onPivotSplash: null,
});

const onTap = (harness: KinematicsHarness, direction: 1 | -1): void => {
  harness.velocityX = swimmerKinematicsOnTap(
    profile,
    harness.locomotion,
    harness.velocityX,
    direction,
    harness.onPivotSplash
  );
};

const update = (harness: KinematicsHarness, dt: number): void => {
  harness.velocityX = swimmerKinematicsUpdate(
    profile,
    harness.locomotion,
    harness.velocityX,
    dt
  );
};

const buildTierThreeHarness = (): KinematicsHarness => {
  const harness = createHarness();
  onTap(harness, 1);
  update(harness, 1 / 60);
  onTap(harness, 1);
  update(harness, 1 / 60);
  onTap(harness, 1);
  update(harness, 1 / 60);
  expect(harness.locomotion.currentTier).toBe(3);
  return harness;
};

describe('swimmerKinematicsController', () => {
  it('escalates tiers on consecutive same-direction taps within the combo window', () => {
    const harness = createHarness();

    onTap(harness, 1);
    expect(harness.locomotion.currentTier).toBe(1);
    update(harness, 1 / 60);
    expect(harness.locomotion.movementState).toBe(MovementState.GLIDE);

    onTap(harness, 1);
    expect(harness.locomotion.currentTier).toBe(2);
    update(harness, 1 / 60);

    onTap(harness, 1);
    expect(harness.locomotion.currentTier).toBe(3);
  });

  it('resets tier to 1 when the combo window expires', () => {
    const harness = createHarness();

    onTap(harness, 1);
    update(harness, 1 / 60);

    const comboWindowSec = profile.comboWindowMs / 1000;
    let elapsed = 0;
    while (elapsed < comboWindowSec + 0.02) {
      update(harness, 1 / 60);
      elapsed += 1 / 60;
    }

    onTap(harness, 1);
    expect(harness.locomotion.currentTier).toBe(1);
  });

  it('interrupts GLIDE with an immediate STRIKE on tap', () => {
    const harness = createHarness();

    onTap(harness, 1);
    update(harness, 1 / 60);
    expect(harness.locomotion.movementState).toBe(MovementState.GLIDE);

    onTap(harness, 1);
    expect(harness.locomotion.movementState).toBe(MovementState.STRIKE);
  });

  it('strikes from IDLE on the first left tap (no forward momentum)', () => {
    const harness = createHarness();

    onTap(harness, -1);
    expect(harness.locomotion.movementState).toBe(MovementState.STRIKE);
    expect(harness.locomotion.facingDirection).toBe(-1);
  });

  it('enters PIVOT_BRAKE with shovel angle and tier-1 lockout when reversing forward motion', () => {
    const harness = createHarness();

    onTap(harness, 1);
    update(harness, 1 / 60);
    expect(Math.abs(harness.velocityX)).toBeGreaterThan(
      swimmerKinematicsTuning.PIVOT_FORWARD_MOMENTUM_MIN
    );

    onTap(harness, -1);
    expect(harness.locomotion.movementState).toBe(MovementState.PIVOT_BRAKE);
    expect(harness.locomotion.targetAngleDeg).toBe(
      -swimmerKinematicsTuning.PIVOT_SHOVEL_ANGLE_DEG *
        harness.locomotion.facingDirection
    );
    expect(harness.locomotion.pivotLockoutTimer).toBeCloseTo(
      profile.pivotLockoutDurations[0] / 1000,
      4
    );
    expect(harness.locomotion.currentTier).toBe(1);
    expect(harness.locomotion.pivotTargetDirection).toBe(-1);
  });

  it('uses tier-3 pivot lockout duration when reversing at tier 3', () => {
    const harness = buildTierThreeHarness();

    onTap(harness, -1);
    expect(harness.locomotion.pivotLockoutTimer).toBeCloseTo(
      profile.pivotLockoutDurations[2] / 1000,
      4
    );
  });

  it('fires splash handler with profile prefab key and impact speed', () => {
    const harness = createHarness();
    const splashEvents: Array<{ prefabKey: string; impactSpeed: number }> = [];
    harness.onPivotSplash = (prefabKey, impactSpeed) => {
      splashEvents.push({ prefabKey, impactSpeed });
    };

    onTap(harness, 1);
    update(harness, 1 / 60);
    const impactSpeed = Math.abs(harness.velocityX);

    onTap(harness, -1);

    expect(splashEvents).toHaveLength(1);
    expect(splashEvents[0].prefabKey).toBe(profile.splashFxPrefabKey);
    expect(splashEvents[0].impactSpeed).toBeCloseTo(impactSpeed, 4);
  });

  it('rejects taps while pivot lockout is active', () => {
    const harness = createHarness();

    onTap(harness, 1);
    update(harness, 1 / 60);
    onTap(harness, -1);
    expect(harness.locomotion.movementState).toBe(MovementState.PIVOT_BRAKE);

    const velocityDuringBrake = harness.velocityX;
    onTap(harness, 1);
    expect(harness.locomotion.movementState).toBe(MovementState.PIVOT_BRAKE);
    expect(harness.locomotion.pivotTargetDirection).toBe(-1);
    expect(harness.velocityX).toBe(velocityDuringBrake);
  });

  it('auto-strikes in the new direction after pivot brake completes', () => {
    const harness = createHarness();

    onTap(harness, 1);
    update(harness, 1 / 60);
    onTap(harness, -1);
    expect(harness.locomotion.movementState).toBe(MovementState.PIVOT_BRAKE);

    const lockoutSec = profile.pivotLockoutDurations[0] / 1000;
    let elapsed = 0;
    while (
      harness.locomotion.movementState === MovementState.PIVOT_BRAKE &&
      elapsed < lockoutSec + 0.2
    ) {
      update(harness, 1 / 60);
      elapsed += 1 / 60;
    }

    expect(harness.locomotion.facingDirection).toBe(-1);
    expect(harness.locomotion.currentTier).toBe(1);
    expect(harness.velocityX).toBeCloseTo(-tierOneImpulse, 2);
    expect(harness.locomotion.targetAngleDeg).toBe(-profile.targetSwimAngles[0]);
  });

  it('decays through GLIDE, DECELERATING, and IDLE', () => {
    const harness = createHarness();

    onTap(harness, 1);
    for (let i = 0; i < 1800; i++) {
      update(harness, 1 / 60);
    }

    expect(harness.locomotion.movementState).toBe(MovementState.IDLE);
    expect(harness.velocityX).toBe(0);
  });

  it('applies tier-1 strike impulse from profile mass and force', () => {
    const harness = createHarness();

    onTap(harness, 1);
    expect(harness.velocityX).toBeCloseTo(tierOneImpulse, 4);
  });

  it('handles wild delta time without NaN velocity or negative lockout overshoot', () => {
    const harness = createHarness();

    onTap(harness, 1);
    update(harness, 1 / 60);
    onTap(harness, -1);

    update(harness, 0.5);
    expect(Number.isFinite(harness.velocityX)).toBe(true);
    expect(harness.locomotion.pivotLockoutTimer).toBeGreaterThanOrEqual(0);
  });

  it('mutates locomotion in place across tap/update steps', () => {
    const harness = createHarness();
    onTap(harness, 1);
    update(harness, 1 / 60);

    const snapshot = { ...harness.locomotion, velocityX: harness.velocityX };
    const restored = createHarness(snapshot);
    restored.velocityX = snapshot.velocityX as number;

    expect(restored.locomotion.movementState).toBe(harness.locomotion.movementState);
    expect(restored.locomotion.currentTier).toBe(harness.locomotion.currentTier);
    expect(restored.locomotion.pivotLockoutTimer).toBe(
      harness.locomotion.pivotLockoutTimer
    );
    expect(restored.locomotion.pivotTargetDirection).toBe(
      harness.locomotion.pivotTargetDirection
    );
    expect(restored.locomotion.currentAngleDeg).toBeCloseTo(
      harness.locomotion.currentAngleDeg,
      4
    );
    expect(restored.locomotion.targetAngleDeg).toBe(harness.locomotion.targetAngleDeg);
    expect(restored.velocityX).toBe(harness.velocityX);
  });

  it('getSwimmerKinematicsTelemetry returns a read-only snapshot', () => {
    const harness = createHarness();
    onTap(harness, 1);
    update(harness, 1 / 60);

    const telemetry = getSwimmerKinematicsTelemetry(
      harness.locomotion,
      harness.velocityX
    );
    expect(telemetry.velocityX).toBe(harness.velocityX);
    expect(telemetry.state).toBe(harness.locomotion.movementState);
    expect(telemetry.currentTier).toBe(harness.locomotion.currentTier);
    expect(telemetry.facingDirection).toBe(harness.locomotion.facingDirection);
    expect(telemetry.currentAngle).toBe(harness.locomotion.currentAngleDeg);
  });
});
