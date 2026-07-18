import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import {
  aabbFromPistonPose,
  buildPistonPose,
  pistonEaseInOut,
  pistonExtension01,
} from '@/Game/hazards/pistonMotion';
import type { PistonHazardParams } from '@/Game/path/platformShaft/types';

const baseParams = (mount: 'floor' | 'ceiling'): PistonHazardParams => ({
  column: 2,
  mount,
  trackLengthRows: 1.5,
  speedRowsPerSec: 1.5,
  safeExitSide: 'left',
  telegraphDelayRows: 0,
  holdAtTipSec: 0.1,
});

describe('pistonMotion', () => {
  it('ease-in-out stays in [0,1]', () => {
    expect(pistonEaseInOut(-1)).toBe(0);
    expect(pistonEaseInOut(0)).toBe(0);
    expect(pistonEaseInOut(0.5)).toBeCloseTo(0.5, 5);
    expect(pistonEaseInOut(1)).toBe(1);
    expect(pistonEaseInOut(2)).toBe(1);
  });

  it('extension ping-pongs within [0,1] even with large time', () => {
    for (const t of [0, 0.1, 1, 10, 100, 1000.37]) {
      const e = pistonExtension01(t, 1.5, 1.5, 0.1);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });

  it('floor pose extends upward (-Y) from mount', () => {
    const pose0 = buildPistonPose({
      mountRowY: 400,
      column: 2,
      leftX: 0,
      columnWidth: 60,
      blockHeight: 60,
      params: baseParams('floor'),
      tSec: 0,
      rowDurationSec: 0.2,
    });
    const poseMid = buildPistonPose({
      mountRowY: 400,
      column: 2,
      leftX: 0,
      columnWidth: 60,
      blockHeight: 60,
      params: baseParams('floor'),
      tSec: 0.5,
      rowDurationSec: 0.2,
    });
    expect(poseMid.headCenterY).toBeLessThan(pose0.headCenterY);
    const aabb = aabbFromPistonPose(poseMid);
    expect(aabb.maxX - aabb.minX).toBeLessThan(
      60 * pistonHazardTuning.HEAD_WIDTH_COL_FRACTION
    );
  });

  it('ceiling pose extends downward (+Y) from mount', () => {
    const pose0 = buildPistonPose({
      mountRowY: 200,
      column: 3,
      leftX: 0,
      columnWidth: 60,
      blockHeight: 60,
      params: baseParams('ceiling'),
      tSec: 0,
      rowDurationSec: 0.2,
    });
    const poseMid = buildPistonPose({
      mountRowY: 200,
      column: 3,
      leftX: 0,
      columnWidth: 60,
      blockHeight: 60,
      params: baseParams('ceiling'),
      tSec: 0.5,
      rowDurationSec: 0.2,
    });
    expect(poseMid.headCenterY).toBeGreaterThan(pose0.headCenterY);
  });

  it('head stays within track tip bounds', () => {
    const params = baseParams('floor');
    for (let t = 0; t < 5; t += 0.05) {
      const pose = buildPistonPose({
        mountRowY: 500,
        column: 2,
        leftX: 0,
        columnWidth: 60,
        blockHeight: 60,
        params,
        tSec: t,
        rowDurationSec: 0.2,
      });
      const tip = pose.trackTipY;
      const base = pose.trackBaseY;
      expect(pose.headCenterY).toBeLessThanOrEqual(base + 1);
      expect(pose.headCenterY).toBeGreaterThanOrEqual(tip - pose.heightPx);
    }
  });

  it('collider AABB is inset vs visual head (fair edge contacts)', () => {
    const pose = buildPistonPose({
      mountRowY: 400,
      column: 2,
      leftX: 0,
      columnWidth: 60,
      blockHeight: 60,
      params: baseParams('floor'),
      tSec: 0.4,
      rowDurationSec: 0.2,
    });
    const collider = aabbFromPistonPose(pose);
    const visualW = pose.widthPx;
    const visualH = pose.heightPx;
    const colliderW = collider.maxX - collider.minX;
    const colliderH = collider.maxY - collider.minY;
    expect(colliderW).toBeLessThan(visualW);
    expect(colliderH).toBeLessThan(visualH);
    expect(colliderW).toBeCloseTo(
      visualW * (1 - pistonHazardTuning.COLLIDER_INSET_FRACTION),
      5
    );
  });

  it('large deltaTime does not tunnel past tip (analytic modulo)', () => {
    const params = baseParams('ceiling');
    const pose = buildPistonPose({
      mountRowY: 100,
      column: 3,
      leftX: 0,
      columnWidth: 60,
      blockHeight: 60,
      params,
      tSec: 999.123,
      rowDurationSec: 0.2,
    });
    const tip = pose.trackTipY;
    const base = pose.trackBaseY;
    expect(pose.headCenterY).toBeGreaterThanOrEqual(base - 1);
    expect(pose.headCenterY).toBeLessThanOrEqual(tip + pose.heightPx);
  });
});
