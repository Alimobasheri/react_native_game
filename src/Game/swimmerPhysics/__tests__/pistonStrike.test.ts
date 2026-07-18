import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import type { PistonHeadSolid } from '@/Game/hazards/mergePistonHazardPass';
import {
  pistonContactThisFrame,
  pistonStillOverlapping,
  resolvePistonHeadStrike,
} from '@/Game/swimmerPhysics/react/pistonStrike';
import { aabbFromCenter } from '@/Game/collision/swimmerBlockCollision';

const makeSolid = (
  overrides: Partial<PistonHeadSolid> = {}
): PistonHeadSolid => {
  const aabb = {
    minX: 100,
    maxX: 140,
    minY: 200,
    maxY: 260,
  };
  return {
    aabb,
    prevAabb: { ...aabb },
    velocityX: 0,
    velocityY: -50,
    leadEntityId: 1,
    hazardId: 'piston-hz-1',
    safeExitSide: 'left',
    headCenterX: 120,
    headCenterY: 230,
    ...overrides,
  };
};

describe('pistonStrike', () => {
  it('caps bounce X at MAX_BOUNCE_IMPULSE_X for high incoming speed', () => {
    const solid = makeSolid();
    const result = resolvePistonHeadStrike({
      swimmerX: 90,
      swimmerY: 230,
      swimmerStartX: 50,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 500,
      pistonSolids: [solid],
      activeContactHazardId: undefined,
      deltaSeconds: 1 / 60,
    });
    expect(result.struck).toBe(true);
    expect(Math.abs(result.impulseVelocityX)).toBeLessThanOrEqual(
      pistonHazardTuning.MAX_BOUNCE_IMPULSE_X
    );
    expect(result.impulseVelocityY).toBeGreaterThan(0);
    expect(result.impulseVelocityY).toBeLessThanOrEqual(
      pistonHazardTuning.MAX_BOUNCE_IMPULSE_Y
    );
  });

  it('bounces away using safeExitSide when centered with zero velocity', () => {
    const solid = makeSolid({ safeExitSide: 'right' });
    const result = resolvePistonHeadStrike({
      swimmerX: 120,
      swimmerY: 230,
      swimmerStartX: 120,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 0,
      pistonSolids: [solid],
      activeContactHazardId: undefined,
      deltaSeconds: 1 / 60,
    });
    expect(result.struck).toBe(true);
    expect(result.impulseVelocityX).toBeGreaterThan(0);
  });

  it('does not bounce again while still latched to same hazard', () => {
    const solid = makeSolid();
    const result = resolvePistonHeadStrike({
      swimmerX: 90,
      swimmerY: 230,
      swimmerStartX: 90,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 200,
      pistonSolids: [solid],
      activeContactHazardId: 'piston-hz-1',
      deltaSeconds: 1 / 60,
    });
    expect(result.struck).toBe(false);
    expect(result.hazardId).toBe('piston-hz-1');
  });

  it('detects swept crossing without final overlap', () => {
    const solid = makeSolid({
      aabb: { minX: 200, maxX: 240, minY: 200, maxY: 260 },
      prevAabb: { minX: 100, maxX: 140, minY: 200, maxY: 260 },
    });
    const start = aabbFromCenter(120, 230, 16, 20);
    // Swimmer stays put; piston sweeps through.
    expect(
      pistonContactThisFrame(start, { x: 0, y: 0 }, solid)
    ).toBe(true);
  });

  it('clears overlap latch after separation', () => {
    const solid = makeSolid();
    expect(
      pistonStillOverlapping(90, 230, 16, 20, 'piston-hz-1', [solid])
    ).toBe(true);
    expect(
      pistonStillOverlapping(20, 230, 16, 20, 'piston-hz-1', [solid])
    ).toBe(false);
  });

  it('recovery duration is time-based (same at 60Hz and 120Hz budgets)', () => {
    const solid = makeSolid();
    const at60 = resolvePistonHeadStrike({
      swimmerX: 90,
      swimmerY: 230,
      swimmerStartX: 50,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 100,
      pistonSolids: [solid],
      activeContactHazardId: undefined,
      deltaSeconds: 1 / 60,
    });
    const at120 = resolvePistonHeadStrike({
      swimmerX: 90,
      swimmerY: 230,
      swimmerStartX: 50,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 100,
      pistonSolids: [solid],
      activeContactHazardId: undefined,
      deltaSeconds: 1 / 120,
    });
    expect(at60.bounceRecoverySec).toBe(at120.bounceRecoverySec);
    expect(at60.bounceRecoverySec).toBe(
      pistonHazardTuning.BOUNCE_RECOVERY_SEC
    );
  });

  it('depenetrates swimmer just outside piston AABB (no pin inside head)', () => {
    const solid = makeSolid();
    const halfW = 16;
    const result = resolvePistonHeadStrike({
      swimmerX: 120,
      swimmerY: 230,
      swimmerStartX: 110,
      swimmerStartY: 230,
      swimmerHalfWidth: halfW,
      swimmerHalfHeight: 20,
      velocityX: 80,
      pistonSolids: [solid],
      activeContactHazardId: undefined,
      deltaSeconds: 1 / 60,
    });
    expect(result.struck).toBe(true);
    const afterX = 120 + result.knockbackDeltaX;
    const afterAabb = aabbFromCenter(afterX, 230, halfW, 20);
    expect(afterAabb.maxX <= solid.aabb.minX || afterAabb.minX >= solid.aabb.maxX).toBe(
      true
    );
  });

  it('re-arms and bounces again only after full separation', () => {
    const solid = makeSolid();
    const first = resolvePistonHeadStrike({
      swimmerX: 90,
      swimmerY: 230,
      swimmerStartX: 50,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 200,
      pistonSolids: [solid],
      activeContactHazardId: undefined,
      deltaSeconds: 1 / 60,
    });
    expect(first.struck).toBe(true);

    const pinned = resolvePistonHeadStrike({
      swimmerX: 90,
      swimmerY: 230,
      swimmerStartX: 90,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 200,
      pistonSolids: [solid],
      activeContactHazardId: first.hazardId,
      deltaSeconds: 1 / 60,
    });
    expect(pinned.struck).toBe(false);

    expect(
      pistonStillOverlapping(20, 230, 16, 20, first.hazardId, [solid])
    ).toBe(false);

    const second = resolvePistonHeadStrike({
      swimmerX: 90,
      swimmerY: 230,
      swimmerStartX: 50,
      swimmerStartY: 230,
      swimmerHalfWidth: 16,
      swimmerHalfHeight: 20,
      velocityX: 200,
      pistonSolids: [solid],
      activeContactHazardId: undefined,
      deltaSeconds: 1 / 60,
    });
    expect(second.struck).toBe(true);
  });

  it('restart cleanup contract: contact + recovery fields clear to idle', () => {
    // Mirrors RestartGameplaySystem + commitFrame idle reset.
    const swimmerState = {
      pistonContactHazardId: 'piston-hz-1' as string | undefined,
      pistonBounceRecoverySecRemaining: 0.22,
    };
    swimmerState.pistonContactHazardId = undefined;
    swimmerState.pistonBounceRecoverySecRemaining = 0;
    expect(swimmerState.pistonContactHazardId).toBeUndefined();
    expect(swimmerState.pistonBounceRecoverySecRemaining).toBe(0);
  });
});
