import { GIGGLE_CRYSTAL_PROFILE } from '../characterProfiles';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';
import { getSwimmerColliderExtents } from '../swimmerCollider';
import {
  applyHyperCasualDrag,
  applyHyperCasualTap,
  buildPinnedEscapeContext,
  computeCoastDisplacementPx,
  computeForwardTapImpulseMagnitude,
  computeHybridSplashStrength,
  computePinnedEscapeMinSlidePx,
  deriveMovementStateFromVelocity,
  estimatePinnedEscapeTravelPx,
  estimateTravelPx,
  getSoftReverseMinCoastSpeedPx,
  simulateTapDisplacementPx,
} from '../swimmerHyperCasualPhysics';
import { computeStreakMultiplier } from '../swimmerTapInput';
import {
  hyperCasualPhysicsTuning,
  swimmerCoastPresets,
  swimmerPhysicsTuning,
} from '@/config/swimmerTuning';
import '../characterProfiles';

const profile = GIGGLE_CRYSTAL_PROFILE;
const columnWidth = 100;
const REFERENCE_FRAME_DT = 1 / 60;

const colliderWidth = (column: number) =>
  getSwimmerColliderExtents(column, false).halfWidth * 2;

describe('swimmerHyperCasualPhysics', () => {
  it('computeCoastDisplacementPx matches loop simulation within tolerance', () => {
    const preset = swimmerCoastPresets.snappy;
    const scenarios = [
      { impulse: 120, speed: 0, current: 0 },
      { impulse: 240, speed: 0.6, current: -80 },
      { impulse: 80, speed: 1, current: 40 },
      { impulse: 50, speed: 0.3, current: 0 },
    ] as const;

    for (const scenario of scenarios) {
      const closed = computeCoastDisplacementPx(
        scenario.impulse,
        1,
        0,
        scenario.speed,
        scenario.current,
        profile,
        preset,
        REFERENCE_FRAME_DT,
        2
      );
      const loop = simulateTapDisplacementPx(
        scenario.impulse,
        1,
        0,
        scenario.speed,
        scenario.current,
        profile,
        preset,
        REFERENCE_FRAME_DT,
        2
      );
      expect(closed).toBeCloseTo(loop, 6);
    }
  });

  it('applyHyperCasualTap adds immediate forward velocity on tap', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    const preset = swimmerCoastPresets.snappy;
    const openClearance = columnWidth * 4;
    const result = applyHyperCasualTap(
      profile,
      locomotion,
      0,
      1,
      columnWidth,
      0,
      1,
      0,
      openClearance,
      colliderWidth(columnWidth)
    );
    expect(result.velocityX).toBeGreaterThan(0);
    expect(result.isSoftReverseTap).toBe(false);
    expect(locomotion.facingDirection).toBe(1);
  });

  it('accelerating streak multiplier increases impulse magnitude toward cap', () => {
    const preset = swimmerCoastPresets.snappy;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const base = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      1,
      profile,
      0,
      1,
      preset,
      openClearance,
      navWidth
    );
    const streak2 = computeStreakMultiplier(1);
    const streakCap = computeStreakMultiplier(20);
    expect(streak2).toBeGreaterThan(1);
    const boosted2 = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      streak2,
      profile,
      0,
      1,
      preset,
      openClearance,
      navWidth
    );
    const boostedCap = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      streakCap,
      profile,
      0,
      1,
      preset,
      openClearance,
      navWidth
    );
    expect(boosted2).toBeGreaterThan(base);
    expect(boostedCap).toBeGreaterThan(boosted2);
  });

  it('applyHyperCasualTap scales impulse with capped streak multiplier', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    const preset = swimmerCoastPresets.snappy;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const streakMult = computeStreakMultiplier(10);
    const result = applyHyperCasualTap(
      profile,
      locomotion,
      0,
      1,
      columnWidth,
      0,
      streakMult,
      0,
      openClearance,
      navWidth
    );
    const expected = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      streakMult,
      profile,
      0,
      1,
      preset,
      openClearance,
      navWidth
    );
    expect(Math.abs(result.tapImpulseApplied)).toBeCloseTo(expected, 0);
  });

  it('simulated coast travel is ~one column after drag at rest in open water', () => {
    const preset = swimmerCoastPresets.snappy;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const target = estimateTravelPx(
      columnWidth,
      1,
      preset,
      openClearance,
      navWidth
    );
    const impulse = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      1,
      profile,
      0,
      1,
      preset,
      openClearance,
      navWidth
    );
    const travel = simulateTapDisplacementPx(
      impulse,
      1,
      0,
      0,
      0,
      profile,
      preset,
      REFERENCE_FRAME_DT,
      2
    );
    expect(travel).toBeGreaterThanOrEqual(target * 0.92);
    expect(travel).toBeLessThanOrEqual(target * 1.08);
  });

  it('narrows tap target to available slack in a one-column gap', () => {
    const preset = swimmerCoastPresets.snappy;
    const navWidth = colliderWidth(columnWidth);
    const narrowTarget = estimateTravelPx(
      columnWidth,
      1,
      preset,
      columnWidth,
      navWidth
    );
    const openTarget = estimateTravelPx(
      columnWidth,
      1,
      preset,
      columnWidth * 4,
      navWidth
    );
    expect(narrowTarget).toBeLessThan(openTarget);
    expect(narrowTarget).toBeCloseTo(
      Math.max(0, columnWidth - navWidth) * 0.96,
      0
    );
  });

  it('simulated coast travel stays ~one column with water speed and opposing current', () => {
    const preset = swimmerCoastPresets.snappy;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const target = estimateTravelPx(
      columnWidth,
      1,
      preset,
      openClearance,
      navWidth
    );
    const opposingCurrent = -80;
    const impulse = computeForwardTapImpulseMagnitude(
      columnWidth,
      0.6,
      1,
      profile,
      opposingCurrent,
      1,
      preset,
      openClearance,
      navWidth
    );
    const travel = simulateTapDisplacementPx(
      impulse,
      1,
      0,
      0.6,
      opposingCurrent,
      profile,
      preset,
      REFERENCE_FRAME_DT,
      2
    );
    expect(travel).toBeGreaterThanOrEqual(target * 0.88);
    expect(travel).toBeLessThanOrEqual(target * 1.12);
  });

  it('high-speed opposite tap soft-brakes with cancel-then-reduced impulse', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    locomotion.facingDirection = 1;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const highCoastSpeed = getSoftReverseMinCoastSpeedPx() + 60;
    const fullImpulse = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      1,
      profile,
      0,
      -1,
      swimmerCoastPresets.snappy,
      openClearance,
      navWidth
    );
    const forward = applyHyperCasualTap(
      profile,
      locomotion,
      highCoastSpeed,
      1,
      columnWidth,
      0,
      1,
      0,
      openClearance,
      navWidth
    );
    expect(forward.isSoftReverseTap).toBe(false);
    const reverse = applyHyperCasualTap(
      profile,
      locomotion,
      highCoastSpeed,
      -1,
      columnWidth,
      0,
      1,
      0,
      openClearance,
      navWidth
    );
    expect(reverse.isSoftReverseTap).toBe(true);
    expect(Math.abs(reverse.tapImpulseApplied)).toBeCloseTo(
      fullImpulse * hyperCasualPhysicsTuning.REVERSE_IMPULSE_SCALE,
      0
    );
    expect(reverse.velocityX).toBeCloseTo(reverse.tapImpulseApplied, 0);
    expect(Math.abs(reverse.velocityX)).toBeLessThan(highCoastSpeed);
  });

  it('moderate-speed opposite tap hard-flips with full cancel-then-impulse', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    locomotion.facingDirection = 1;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const preset = swimmerCoastPresets.snappy;
    const moderateCoastSpeed = getSoftReverseMinCoastSpeedPx() - 40;
    const fullImpulse = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      1,
      profile,
      0,
      -1,
      preset,
      openClearance,
      navWidth
    );
    const reverse = applyHyperCasualTap(
      profile,
      locomotion,
      moderateCoastSpeed,
      -1,
      columnWidth,
      0,
      1,
      0,
      openClearance,
      navWidth
    );
    expect(reverse.isSoftReverseTap).toBe(false);
    expect(Math.abs(reverse.tapImpulseApplied)).toBeCloseTo(fullImpulse, 0);
    expect(reverse.velocityX).toBeCloseTo(-fullImpulse, 0);
  });

  it('opposite tap at rest or low drift is a full forward tap without pivot penalty', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    locomotion.facingDirection = 1;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const preset = swimmerCoastPresets.snappy;
    const fullImpulse = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      1,
      profile,
      0,
      -1,
      preset,
      openClearance,
      navWidth
    );
    const atRest = applyHyperCasualTap(
      profile,
      locomotion,
      0,
      -1,
      columnWidth,
      0,
      1,
      0,
      openClearance,
      navWidth
    );
    expect(atRest.isSoftReverseTap).toBe(false);
    expect(atRest.velocityX).toBeCloseTo(-fullImpulse, 0);

    locomotion.facingDirection = 1;
    const slowDrift = applyHyperCasualTap(
      profile,
      locomotion,
      20,
      -1,
      columnWidth,
      0,
      1,
      0,
      openClearance,
      navWidth
    );
    expect(slowDrift.isSoftReverseTap).toBe(false);
    expect(Math.abs(slowDrift.tapImpulseApplied)).toBeCloseTo(fullImpulse, 0);
    expect(slowDrift.velocityX).toBeCloseTo(-fullImpulse, 0);
  });

  it('applyHyperCasualDrag decays velocity toward zero', () => {
    let vx = 400;
    for (let i = 0; i < 300; i++) {
      vx = applyHyperCasualDrag(vx, 0, profile, 1 / 60);
    }
    expect(Math.abs(vx)).toBeLessThan(hyperCasualPhysicsTuning.VELOCITY_ZERO_EPSILON);
  });

  it('higher water speed increases drag', () => {
    const low = applyHyperCasualDrag(300, 0, profile, 1 / 60);
    const high = applyHyperCasualDrag(300, 1, profile, 1 / 60);
    expect(Math.abs(high)).toBeLessThan(Math.abs(low));
  });

  it('floaty preset coasts longer than snappy preset', () => {
    let snappyVx = 300;
    let floatyVx = 300;
    for (let i = 0; i < 60; i++) {
      snappyVx = applyHyperCasualDrag(
        snappyVx,
        0,
        profile,
        1 / 60,
        swimmerCoastPresets.snappy
      );
      floatyVx = applyHyperCasualDrag(
        floatyVx,
        0,
        profile,
        1 / 60,
        swimmerCoastPresets.floaty
      );
    }
    expect(Math.abs(floatyVx)).toBeGreaterThan(Math.abs(snappyVx));
  });

  it('deriveMovementStateFromVelocity returns IDLE at rest', () => {
    expect(deriveMovementStateFromVelocity(0, 'IDLE' as never)).toBe('IDLE');
  });

  it('computeHybridSplashStrength stacks tier and streak with cap', () => {
    const low = computeHybridSplashStrength(1, 1);
    const high = computeHybridSplashStrength(3, computeStreakMultiplier(10));
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(hyperCasualPhysicsTuning.MAX_SPLASH_STRENGTH);
  });

  it('estimatePinnedEscapeTravelPx targets exit past ceiling column edge', () => {
    const ceilingMinX = 150;
    const ceilingMaxX = 250;
    const swimmerX = 200;
    const target = estimatePinnedEscapeTravelPx(
      swimmerX,
      1,
      ceilingMinX,
      ceilingMaxX,
      columnWidth,
      1
    );
    const minTravel =
      columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_MIN_TAP_TRAVEL_COLUMN_FRACTION;
    expect(target).toBeGreaterThanOrEqual(minTravel);
    expect(target).toBeGreaterThanOrEqual(
      Math.abs(swimmerX - ceilingMaxX) +
        columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_EXIT_SLACK_COLUMN_FRACTION
    );
  });

  it('computePinnedEscapeMinSlidePx exceeds legacy 12% column floor', () => {
    const minSlide = computePinnedEscapeMinSlidePx(
      200,
      1,
      150,
      250,
      columnWidth
    );
    expect(minSlide).toBeGreaterThanOrEqual(
      columnWidth * swimmerPhysicsTuning.PINNED_ESCAPE_MIN_SLIDE_COLUMN_FRACTION
    );
    expect(minSlide).toBeGreaterThan(columnWidth * 0.12);
  });

  it('applyHyperCasualTap uses pinned escape travel instead of narrow gap clearance', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    const preset = swimmerCoastPresets.snappy;
    const navWidth = colliderWidth(columnWidth);
    const narrowClearance = columnWidth;
    const gapTarget = estimateTravelPx(
      columnWidth,
      1,
      preset,
      narrowClearance,
      navWidth
    );
    const pinnedTarget = estimatePinnedEscapeTravelPx(
      200,
      1,
      150,
      250,
      columnWidth,
      1
    );
    expect(pinnedTarget).toBeGreaterThan(gapTarget);

    const gapImpulse = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      1,
      profile,
      0,
      1,
      preset,
      narrowClearance,
      navWidth
    );
    const pinnedImpulse = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      1,
      profile,
      0,
      1,
      preset,
      narrowClearance,
      navWidth,
      pinnedTarget
    );
    expect(pinnedImpulse).toBeGreaterThan(gapImpulse);

    const pinnedTap = applyHyperCasualTap(
      profile,
      locomotion,
      0,
      1,
      columnWidth,
      0,
      1,
      0,
      narrowClearance,
      navWidth,
      { swimmerX: 200, ceilingMinX: 150, ceilingMaxX: 250 }
    );
    expect(Math.abs(pinnedTap.tapImpulseApplied)).toBeCloseTo(pinnedImpulse, 0);
    expect(Math.abs(pinnedTap.tapImpulseApplied)).toBeGreaterThan(gapImpulse);
  });

  it('buildPinnedEscapeContext falls back to swimmer column when ceiling bounds missing', () => {
    const ctx = buildPinnedEscapeContext(200, columnWidth, 250, 500);
    expect(ctx.ceilingMaxX - ctx.ceilingMinX).toBeCloseTo(columnWidth, 1);
    expect(200).toBeGreaterThanOrEqual(ctx.ceilingMinX);
    expect(200).toBeLessThanOrEqual(ctx.ceilingMaxX);
  });

  it('applyHyperCasualTap does not soft-reverse while pinned', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    locomotion.facingDirection = 1;
    const navWidth = colliderWidth(columnWidth);
    const coastSpeed = getSoftReverseMinCoastSpeedPx() + 40;
    const pinnedEscape = buildPinnedEscapeContext(
      200,
      columnWidth,
      250,
      500,
      150,
      250
    );
    const reverse = applyHyperCasualTap(
      profile,
      locomotion,
      coastSpeed,
      -1,
      columnWidth,
      0,
      1,
      0,
      columnWidth * 4,
      navWidth,
      pinnedEscape
    );
    expect(reverse.isSoftReverseTap).toBe(false);
    expect(reverse.tapImpulseApplied).toBeLessThan(0);
  });
});
