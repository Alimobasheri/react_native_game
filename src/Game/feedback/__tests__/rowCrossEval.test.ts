import { skillFeedbackTuning } from '@/config/skillFeedback';
import { detectSteerPraise } from '../steerPraiseDetection';
import { buildRowCrossSnapshot } from '../rowCrossEval';
import { resolveSkillGates } from '../skillSurvivalGates';

const COLS = 8;
const WIDE_CHUTE = [1, 2, 3, 4, 5, 6];
const gates = resolveSkillGates(0.2, 0.3, skillFeedbackTuning);
const extras = { ceilingBrush: false, colliding: false, clearance01: 1 };

const buildSnap = (
  gaps: readonly number[],
  swimmerCol: number,
  crossedAtMs = 0,
  swimmerColFrac = swimmerCol
) =>
  buildRowCrossSnapshot(
    gaps,
    COLS,
    swimmerCol,
    swimmerColFrac,
    '',
    crossedAtMs,
    false,
    false,
    skillFeedbackTuning,
    gates,
    [],
    extras
  );

describe('buildRowCrossSnapshot — path-based integration', () => {
  it('stable lane topology when swimmer moves within identical wide gaps', () => {
    const left = buildSnap(WIDE_CHUTE, 2);
    const right = buildSnap(WIDE_CHUTE, 5, 100);
    expect(left.rawGaps).toEqual(WIDE_CHUTE);
    expect(right.rawGaps).toEqual(WIDE_CHUTE);
    expect(left.topology.center).toBe(right.topology.center);
    expect(left.topology.gaps).toEqual(WIDE_CHUTE);
  });

  it('does not produce steer praise when only swimmer column changes', () => {
    const history = [buildSnap(WIDE_CHUTE, 2)];
    const current = buildSnap(WIDE_CHUTE, 5, 100);
    const event = detectSteerPraise({
      history,
      current,
      speedNorm: 0.2,
      difficulty01: 0.1,
      anchorX: 0,
      anchorY: 0,
      tuning: skillFeedbackTuning,
      stitchSampler: { ceilingBrushSeen: false, sideBlockedSeen: false, pinnedSeen: false, collidingSeen: false, minClearanceSeen: 1 },
      gates,
    });
    expect(event).toBeNull();
  });

  it('multipath row uses swimmer lane cluster not full row', () => {
    const snapshot = buildSnap([1, 5, 6, 7], 6);
    expect(snapshot.topology.gaps).toEqual([5, 6, 7]);
    expect(snapshot.rawGaps).toEqual([1, 5, 6, 7]);
  });

  it('crossQualified at high diff near-gap without strict clean cross', () => {
    const hardGates = resolveSkillGates(0.8, 0.5, skillFeedbackTuning);
    const snapshot = buildRowCrossSnapshot(
      [4, 5, 6],
      COLS,
      3,
      3,
      '',
      0,
      false,
      false,
      skillFeedbackTuning,
      hardGates,
      [],
      { ceilingBrush: true, colliding: false, clearance01: 0.4 }
    );
    expect(snapshot.cleanCross).toBe(false);
    expect(snapshot.crossQualified).toBe(true);
    expect(snapshot.contact.ceilingBrush).toBe(true);
  });
});
