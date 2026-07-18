import {
  aabbFromPendulumHeadWorld,
  buildPendulumHeadTransformFromParams,
  pendulumAnchorWorldCenter,
} from '@/Game/hazards/pendulumMotion';
import { aabbOverlap } from '@/Game/collision/swimmerBlockCollision';
import type { PendulumHazardParams } from '@/Game/path/platformShaft/types';

const columnWidth = 48;
const blockHeight = 48;
const leftX = 0;

const baseParams: PendulumHazardParams = {
  anchorCol: 2,
  tetherLengthRows: 4,
  maxAngleRads: 0.6,
  swingFrequencyHz: 0.8,
  phaseOffsetRads: 0,
};

describe('pendulumHeadCollision', () => {
  const swimmerAabb = (cx: number, cy: number) => ({
    minX: cx - 18,
    maxX: cx + 18,
    minY: cy - 22,
    maxY: cy + 22,
  });

  it('AABB overlap at 5 arc sample angles', () => {
    const anchorRowY = 200;
    const anchor = pendulumAnchorWorldCenter(anchorRowY, 2, leftX, columnWidth, blockHeight);
    const freq = baseParams.swingFrequencyHz;
    const samples = [0, 0.25 / freq, 0.5 / freq, 0.75 / freq, 1 / freq];
    let overlapCount = 0;
    for (const tSec of samples) {
      const head = buildPendulumHeadTransformFromParams(
        anchorRowY,
        2,
        leftX,
        columnWidth,
        blockHeight,
        baseParams,
        tSec
      );
      const headAabb = aabbFromPendulumHeadWorld(anchor.x, anchor.y, head);
      if (aabbOverlap(swimmerAabb(anchor.x + head.centerX, anchor.y + head.centerY), headAabb)) {
        overlapCount += 1;
      }
    }
    expect(overlapCount).toBeGreaterThanOrEqual(1);
  });
});
