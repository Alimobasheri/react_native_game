import { skillFeedbackTuning } from '@/config/skillFeedback';
import { topologyFromGaps } from '../gapTopology';
import {
  computeHygiene01,
  resetContactWindow,
  updateContactWindow,
  updateStitchSampler,
} from '../hygieneScoring';
import {
  createDefaultStitchSampler,
  defaultRowCrossContact,
  type RowCrossSnapshot,
} from '../skillFeedbackTypes';

const COLS = 8;

const snap = (
  gaps: number[],
  contactOverrides: Partial<ReturnType<typeof defaultRowCrossContact>> = {}
): RowCrossSnapshot => ({
  rawGaps: gaps,
  topology: topologyFromGaps(gaps, COLS),
  branchKey: '',
  crossedAtMs: 0,
  swimmerCol: gaps[Math.floor(gaps.length / 2)] ?? 0,
  swimmerColFrac: gaps[Math.floor(gaps.length / 2)] ?? 0,
  cleanCross: true,
  crossQualified: true,
  contact: defaultRowCrossContact(contactOverrides),
});

describe('updateStitchSampler', () => {
  it('OR-accumulates contact flags per frame', () => {
    let sampler = createDefaultStitchSampler();
    sampler = updateStitchSampler(sampler, {
      sideBlocked: true,
      ceilingBrush: false,
      colliding: false,
      pinned: false,
      clearance01: 0.8,
      swimmerColFrac: 3.2,
    });
    sampler = updateStitchSampler(sampler, {
      sideBlocked: false,
      ceilingBrush: true,
      colliding: true,
      pinned: false,
      clearance01: 0.3,
      swimmerColFrac: 4.1,
    });
    expect(sampler.sideBlockedSeen).toBe(true);
    expect(sampler.ceilingBrushSeen).toBe(true);
    expect(sampler.collidingSeen).toBe(true);
    expect(sampler.minSwimmerColFracSeen).toBe(3.2);
    expect(sampler.maxSwimmerColFracSeen).toBe(4.1);
  });
});

describe('updateContactWindow', () => {
  it('updates nested stitch sampler', () => {
    const window = resetContactWindow();
    const next = updateContactWindow(window, {
      sideBlocked: true,
      ceilingBrush: false,
      colliding: false,
      pinned: false,
      clearance01: 0.5,
      swimmerColFrac: 2.5,
    });
    expect(next.stitchSampler.sideBlockedSeen).toBe(true);
  });
});

describe('computeHygiene01', () => {
  it('returns 1.0 for clean window with no stitch flags', () => {
    const history = [snap([2]), snap([3]), snap([4])];
    const sampler = createDefaultStitchSampler();
    const hygiene = computeHygiene01(history, 3, sampler, skillFeedbackTuning);
    expect(hygiene).toBeGreaterThanOrEqual(0.95);
  });

  it('applies penalties for side/ceiling/colliding stitch', () => {
    const history = [snap([2])];
    const sampler = updateStitchSampler(createDefaultStitchSampler(), {
      sideBlocked: true,
      ceilingBrush: true,
      colliding: true,
      pinned: false,
      clearance01: 0.2,
    });
    const hygiene = computeHygiene01(history, 1, sampler, skillFeedbackTuning);
    expect(hygiene).toBeLessThan(0.72);
  });

  it('returns 0 when pinned in window and disqualify enabled', () => {
    const sampler = updateStitchSampler(createDefaultStitchSampler(), {
      sideBlocked: false,
      ceilingBrush: false,
      colliding: false,
      pinned: true,
      clearance01: 1,
      swimmerColFrac: 4,
    });
    expect(
      computeHygiene01([], 1, sampler, skillFeedbackTuning)
    ).toBe(0);
  });

  it('tierUpgradeMin boundary: just below blocks upgrade tier logic', () => {
    const cfg = skillFeedbackTuning.hygiene;
    const history = [snap([2], { clearance01: 0.5 })];
    const sampler = updateStitchSampler(createDefaultStitchSampler(), {
      sideBlocked: true,
      ceilingBrush: false,
      colliding: false,
      pinned: false,
      clearance01: 0.5,
      swimmerColFrac: 3,
    });
    const hygiene = computeHygiene01(history, 1, sampler, skillFeedbackTuning);
    expect(hygiene).toBeLessThan(cfg.tierUpgradeMin);
  });
});
