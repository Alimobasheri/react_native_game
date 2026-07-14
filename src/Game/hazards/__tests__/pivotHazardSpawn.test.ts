import { createHazardBandLeadComponent } from '@/Game/ecs-components/HazardBandLead';
import type { PivotHazardParams } from '@/Game/path/platformShaft/types';

describe('pivotHazardSpawn', () => {
  it('creates pivot lead with matter spawn flag false', () => {
    const pivotParams: PivotHazardParams = {
      armCount: 4,
      rpm: 15,
      direction: 'cw',
      anchorMode: 'center',
      armLengthCols: 2,
      armThicknessRows: 1,
    };
    const lead = createHazardBandLeadComponent({
      kind: 'pivot',
      modifierId: 'pivot-hz-1',
      hazardId: 'pivot-hz-1',
      bounds: { rowStart: 10, rowEnd: 15, colStart: 0, colEnd: 5 },
      pivotParams,
      memberRowEntityIds: [1, 2, 3],
    });
    expect(lead.data.kind).toBe('pivot');
    expect(lead.data.pivotMatterSpawned).toBe(false);
    expect(lead.data.pivotParams?.armCount).toBe(4);
    expect(lead.data.pivotArmEntityIds).toEqual([]);
  });
});
