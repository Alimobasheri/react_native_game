import {
  aabbFromPendulumHeadTransform,
  buildPendulumHeadTransformFromParams,
  pendulumAngleRad,
  pendulumHeadTransform,
  pendulumTSecFromSpawn,
  pendulumTroughForce,
  TWO_PI,
} from '@/Game/hazards/pendulumMotion';
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

describe('pendulumMotion', () => {
  it('SHM angle at 5 arc points matches cos formula', () => {
    const max = 0.6;
    const freq = 0.8;
    const phase = 0;
    const samples = [0, 0.25 / freq, 0.5 / freq, 0.75 / freq, 1 / freq];
    for (const t of samples) {
      const expected = max * Math.cos(TWO_PI * freq * t + phase);
      expect(pendulumAngleRad(t, max, freq, phase)).toBeCloseTo(expected, 5);
    }
  });

  it('head hangs below pivot at angle zero in local space', () => {
    const tether = blockHeight * 4;
    const head = pendulumHeadTransform(tether, 0, columnWidth, blockHeight);
    expect(head.centerY).toBeGreaterThan(head.hingeY);
    expect(head.hingeY).toBeCloseTo(tether, 5);
    expect(Math.abs(head.centerX)).toBeLessThan(1);
  });

  it('head swings horizontally at max angle', () => {
    const tether = blockHeight * 4;
    const maxAngle = 0.6;
    const head = pendulumHeadTransform(tether, maxAngle, columnWidth, blockHeight);
    expect(head.centerX).toBeGreaterThan(0);
  });

  it('head stays upright — AABB uses unrotated box', () => {
    const transform = pendulumHeadTransform(blockHeight * 4, 0.5, columnWidth, blockHeight);
    const aabb = aabbFromPendulumHeadTransform(transform);
    expect(aabb.maxX - aabb.minX).toBeCloseTo(columnWidth, 1);
    expect(aabb.maxY - aabb.minY).toBeCloseTo(blockHeight, 1);
  });

  it('buildPendulumHeadTransformFromParams uses absolute spawn time', () => {
    const spawnMs = 1000;
    const tSec = pendulumTSecFromSpawn(2500, spawnMs);
    expect(tSec).toBeCloseTo(1.5, 5);
    const head = buildPendulumHeadTransformFromParams(
      200,
      2,
      leftX,
      columnWidth,
      blockHeight,
      baseParams,
      tSec
    );
    expect(head.centerY).toBeGreaterThan(0);
  });

  it('trough force peaks at max swing angle', () => {
    expect(pendulumTroughForce(0, 0.6)).toBeLessThan(pendulumTroughForce(0.6, 0.6));
    expect(pendulumTroughForce(0.6, 0.6)).toBeCloseTo(1, 5);
  });
});
