import {
  createHazardBandLeadComponent,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import {
  createHazardBandMemberComponent,
  HazardBandMemberComponentName,
} from '@/Game/ecs-components/HazardBandMember';

describe('HazardBandLead', () => {
  it('factory sets monotonic latch defaults', () => {
    const comp = createHazardBandLeadComponent({
      modifierId: 'mod-1',
      hazardId: 'platform-hz-1',
      side: 'right',
      bounds: { rowStart: 8, rowEnd: 10, colStart: 4, colEnd: 4 },
      params: { pressCols: 1, pressDurationSec: 1.2 },
      memberRowEntityIds: [1, 2, 3],
      shaftSegmentEpoch: 2,
    });
    expect(comp.name).toBe(HazardBandLeadComponentName);
    expect(comp.data.maxWorldBeat).toBe(-1);
    expect(comp.data.phase01).toBe(0);
    expect(comp.data.memberRowEntityIds).toEqual([1, 2, 3]);
    expect(comp.data.shaftSegmentEpoch).toBe(2);
  });
});

describe('HazardBandMember', () => {
  it('factory links member to lead', () => {
    const comp = createHazardBandMemberComponent('mod-1', 42);
    expect(comp.name).toBe(HazardBandMemberComponentName);
    expect(comp.data.leadEntityId).toBe(42);
    expect(comp.data.modifierId).toBe('mod-1');
  });
});
