import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import {
  blendPinnedSlabSurfaceVelocityX,
  computePinnedCoastDragMultiplier,
  computePinnedVisualTargetAngleDeg,
  isPinnedHighAngleLean,
  shouldEnablePinnedMomentumCoast,
} from '../swimmerPinnedLocomotion';

describe('swimmerPinnedLocomotion', () => {
  it('detects high-angle lean threshold', () => {
    expect(isPinnedHighAngleLean(44)).toBe(false);
    expect(isPinnedHighAngleLean(45)).toBe(true);
    expect(isPinnedHighAngleLean(-70)).toBe(true);
  });

  it('requires high lean AND speed for momentum coast', () => {
    expect(shouldEnablePinnedMomentumCoast(70, 0)).toBe(false);
    expect(
      shouldEnablePinnedMomentumCoast(
        70,
        swimmerPhysicsTuning.PINNED_MOMENTUM_COAST_MIN_SPEED_PX
      )
    ).toBe(true);
    expect(
      shouldEnablePinnedMomentumCoast(
        10,
        swimmerPhysicsTuning.PINNED_MOMENTUM_COAST_MIN_SPEED_PX
      )
    ).toBe(false);
  });

  it('softens but does not zero coast drag at high lean', () => {
    const flat = computePinnedCoastDragMultiplier(0);
    const steep = computePinnedCoastDragMultiplier(90);
    expect(flat).toBe(1);
    expect(steep).toBe(
      swimmerPhysicsTuning.PINNED_EDGE_SLIDE_COAST_DRAG_MULTIPLIER
    );
    expect(steep).toBeGreaterThan(0);
    expect(steep).toBeLessThan(1);
  });

  it('holds stretched lean instead of snapping upright', () => {
    const target = computePinnedVisualTargetAngleDeg(
      75,
      12,
      80,
      true,
      1,
      0
    );
    expect(Math.abs(target)).toBeGreaterThanOrEqual(75);
    expect(Math.sign(target)).toBe(1);
  });

  it('blends velocity toward extending slab surface speed', () => {
    const next = blendPinnedSlabSurfaceVelocityX(0, 120, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(120);
  });
});
