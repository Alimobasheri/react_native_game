import {
  buildArmTransformsForPivot,
  columnsBlockedByArmsAtY,
  effectiveGapsFromBlockedCols,
  pivotHubWorldCenter,
} from '@/Game/hazards/pivotMotion';
import type { PivotHazardParams } from '@/Game/path/platformShaft/types';

describe('pivotColumnMask', () => {
  const columnWidth = 48;
  const blockHeight = 48;
  const leftX = 10;
  const waterY = 300;
  const baseGaps = [0, 1, 2, 3, 4, 5];

  it('columnsBlockedByArmsAtY opens >=2 cols at water line for teach RPM geometry', () => {
    const params: PivotHazardParams = {
      armCount: 2,
      rpm: 15,
      direction: 'cw',
      anchorMode: 'center',
      armLengthCols: 2,
      armThicknessRows: 1,
    };
    const hub = pivotHubWorldCenter([waterY], 'center', 6, leftX, columnWidth);
    const transforms = buildArmTransformsForPivot(
      hub,
      Math.PI / 4,
      params,
      columnWidth,
      blockHeight
    );
    const blocked = columnsBlockedByArmsAtY(
      transforms,
      waterY,
      6,
      leftX,
      columnWidth
    );
    const effective = effectiveGapsFromBlockedCols(baseGaps, blocked);
    expect(effective.length).toBeGreaterThanOrEqual(2);
  });
});
