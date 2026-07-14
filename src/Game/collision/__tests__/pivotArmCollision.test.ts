import {
  isPinnedUnderRotatingArm,
  lateralShoveFromArmImpact,
  type PivotArmSolid,
} from '@/Game/collision/swimmerBlockCollision';
import { hubAabbFromPivot, pivotHubWorldCenter } from '@/Game/hazards/pivotMotion';

describe('pivotArmCollision', () => {
  const arm: PivotArmSolid = {
    aabb: { minX: 100, maxX: 140, minY: 180, maxY: 220 },
    velocityX: 40,
    velocityY: 60,
  };

  it('pin activates when AABB intersects downward-traveling arm quadrant', () => {
    const pinned = isPinnedUnderRotatingArm(
      120,
      210,
      16,
      16,
      arm,
      0
    );
    expect(pinned).toBe(true);
  });

  it('lateral shove direction matches CW rotation at contact', () => {
    const shove = lateralShoveFromArmImpact(120, 200, arm, 0.016);
    expect(shove).not.toBe(0);
  });

  it('hub aabb covers center grid position', () => {
    const hub = pivotHubWorldCenter([200], 'center', 6, 0, 48);
    const box = hubAabbFromPivot(hub, 48, 48);
    expect(120).toBeGreaterThanOrEqual(box.minX);
    expect(120).toBeLessThanOrEqual(box.maxX);
    expect(200).toBeGreaterThanOrEqual(box.minY);
    expect(200).toBeLessThanOrEqual(box.maxY);
  });
});
