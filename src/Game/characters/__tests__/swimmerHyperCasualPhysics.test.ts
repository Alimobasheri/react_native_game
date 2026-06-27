import { GIGGLE_CRYSTAL_PROFILE } from '../characterProfiles';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';
import { getSwimmerColliderExtents } from '../swimmerCollider';
import {
  applyHyperCasualDrag,
  applyHyperCasualTap,
  buildPinnedEscapeContext,
  computeForwardTapImpulseMagnitude,
  computeHybridSplashStrength,
  computePinnedEscapeMinSlidePx,
  deriveMovementStateFromVelocity,
  estimatePinnedEscapeTravelPx,
  estimateTravelPx,
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

  it('sqrt streak multiplier increases impulse magnitude without cap', () => {
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
    const streak5 = computeStreakMultiplier(5);
    const streak20 = computeStreakMultiplier(20);
    expect(streak20).toBeGreaterThan(streak5);
    const boosted5 = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      streak5,
      profile,
      0,
      1,
      preset,
      openClearance,
      navWidth
    );
    const boosted20 = computeForwardTapImpulseMagnitude(
      columnWidth,
      0,
      streak20,
      profile,
      0,
      1,
      preset,
      openClearance,
      navWidth
    );
    expect(boosted5).toBeGreaterThan(base);
    expect(boosted20).toBeGreaterThan(boosted5);
  });

  it('applyHyperCasualTap scales impulse with uncapped streak multiplier', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    const preset = swimmerCoastPresets.snappy;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const streakMult = computeStreakMultiplier(20);
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

  it('soft reverse tap adds reduced impulse only while coasting fast with facing', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    locomotion.facingDirection = 1;
    const openClearance = columnWidth * 4;
    const navWidth = colliderWidth(columnWidth);
    const coastSpeed =
      hyperCasualPhysicsTuning.SOFT_REVERSE_MIN_COAST_SPEED + 40;
    const forward = applyHyperCasualTap(
      profile,
      locomotion,
      coastSpeed,
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
      coastSpeed,
      -1,
      columnWidth,
      0,
      1,
      0,
      openClearance,
      navWidth
    );
    expect(reverse.isSoftReverseTap).toBe(true);
    expect(Math.abs(reverse.tapImpulseApplied)).toBeLessThan(
      Math.abs(
        computeForwardTapImpulseMagnitude(
          columnWidth,
          0,
          1,
          profile,
          0,
          -1,
          swimmerCoastPresets.snappy,
          openClearance,
          navWidth
        )
      )
    );
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
    expect(Math.abs(atRest.tapImpulseApplied)).toBeCloseTo(fullImpulse, 0);

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
    const coastSpeed =
      hyperCasualPhysicsTuning.SOFT_REVERSE_MIN_COAST_SPEED + 40;
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
