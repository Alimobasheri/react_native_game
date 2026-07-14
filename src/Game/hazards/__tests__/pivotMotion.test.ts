import {
  aabbFromArmTransform,
  armBaseAngleRad,
  armWorldTransform,
  buildArmTransformsForPivot,
  columnsBlockedByPivotAtY,
  pivotAngleFromLocalSec,
  pivotHubWorldCenter,
  TWO_PI,
} from '@/Game/hazards/pivotMotion';
import { capPivotRpm } from '@/config/pivotHazardTuning';
import type { PivotHazardParams } from '@/Game/path/platformShaft/types';

const columnWidth = 40;
const blockHeight = 40;
const leftX = 0;

const baseParams: PivotHazardParams = {
  armCount: 4,
  rpm: 15,
  direction: 'cw',
  anchorMode: 'center',
  armLengthCols: 2,
  armThicknessRows: 1,
};

describe('pivotMotion', () => {
  it('arm base angles at 90-degree intervals for 4 arms', () => {
    expect(armBaseAngleRad(0, 4)).toBeCloseTo(0, 5);
    expect(armBaseAngleRad(1, 4)).toBeCloseTo(Math.PI / 2, 5);
    expect(armBaseAngleRad(2, 4)).toBeCloseTo(Math.PI, 5);
    expect(armBaseAngleRad(3, 4)).toBeCloseTo((3 * Math.PI) / 2, 5);
  });

  it('OBB generation matches expected rotation angles at 90-degree intervals', () => {
    const hub = pivotHubWorldCenter([200], 'center', 6, leftX, columnWidth);
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (let i = 0; i < angles.length; i++) {
      const t = armWorldTransform(
        hub.x,
        hub.y,
        angles[i],
        0,
        4,
        columnWidth * 2,
        blockHeight,
        columnWidth
      );
      const aabb = aabbFromArmTransform(t);
      expect(aabb.maxX).toBeGreaterThan(aabb.minX);
      expect(aabb.maxY).toBeGreaterThan(aabb.minY);
      if (i === 0) {
        expect(t.centerX).toBeGreaterThan(hub.x);
        expect(Math.abs(t.centerY - hub.y)).toBeLessThan(1);
      }
      if (i === 1) {
        expect(t.centerY).toBeGreaterThan(hub.y);
      }
    }
  });

  it('pivotAngleFromLocalSec advances with rpm', () => {
    const angle1 = pivotAngleFromLocalSec(1, baseParams);
    const angle2 = pivotAngleFromLocalSec(2, baseParams);
    expect(angle2).toBeGreaterThan(angle1);
    expect(angle1).toBeLessThan(TWO_PI);
  });

  it('RPM cap respects 2-col min gap fairness', () => {
    const capped = capPivotRpm(120, 4, 6, columnWidth, 0.1);
    expect(capped).toBeLessThan(120);
    expect(capped).toBeGreaterThan(0);
  });

  it('hub blocks center column at water line', () => {
    const hub = pivotHubWorldCenter([200], 'center', 6, leftX, columnWidth);
    const transforms = buildArmTransformsForPivot(
      hub,
      0,
      baseParams,
      columnWidth,
      blockHeight
    );
    const blocked = columnsBlockedByPivotAtY(
      hub,
      transforms,
      200,
      6,
      leftX,
      columnWidth,
      blockHeight
    );
    expect(blocked).toContain(2);
    expect(blocked).toContain(3);
  });
});
