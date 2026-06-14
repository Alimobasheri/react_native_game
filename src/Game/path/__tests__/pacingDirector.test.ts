import {
  OBSTACLE_PACING_CYCLE_ROW_COUNT,
  obstaclePacingTuning,
} from '@/config/obstaclePacing';
import {
  PacingDirector,
  pacingPhaseAtTotalRows,
  pacingRowInCycle,
  runEmbeddedPacingValidations,
  validateSeam,
} from '@/Game/path/pacingDirector';
import type { SwimmerRow } from '@/Game/path/swimmerGrid';

const F = obstaclePacingTuning.FLOW_ROW_COUNT;
const T = obstaclePacingTuning.TENSION_ROW_COUNT;
const X = obstaclePacingTuning.CLIMAX_ROW_COUNT;
const R = obstaclePacingTuning.RELEASE_ROW_COUNT;
const C = OBSTACLE_PACING_CYCLE_ROW_COUNT;
const lastFlow = F - 1;
const firstTension = F;
const lastTension = F + T - 1;
const firstClimax = F + T;
const lastClimax = F + T + X - 1;
const firstRelease = F + T + X;
const lastRelease = C - 1;

beforeAll(() => {
  runEmbeddedPacingValidations();
});

function rowFromMask(mask: string): SwimmerRow {
  const cells = mask.replace(/\s/g, '').split('').map((ch) => (ch === '0' ? 0 : 1)) as SwimmerRow;
  return cells;
}

describe('validateSeam', () => {
  it('rejects rows with no shared gap column', () => {
    const a = rowFromMask('111101111111111');
    const b = rowFromMask('111110111111111');
    expect(validateSeam(a, b)).toBe(false);
  });

  it('accepts when at least one column is open in both rows', () => {
    const a = rowFromMask('111101111111111');
    const b = rowFromMask('111101111111111');
    expect(validateSeam(a, b)).toBe(true);
  });

  it('respects shortest row length when lengths differ', () => {
    const a: SwimmerRow = [0, 1, 1];
    const b: SwimmerRow = [1, 0, 1, 0];
    expect(validateSeam(a, b)).toBe(false);
  });
});

describe('PacingDirector phases', () => {
  it('cycle length matches sum of phase row counts', () => {
    expect(F + T + X + R).toBe(C);
  });

  it('indexes cycle and phases from config', () => {
    expect(pacingRowInCycle(0)).toBe(0);
    expect(pacingRowInCycle(lastRelease)).toBe(lastRelease);
    expect(pacingRowInCycle(C)).toBe(0);
    expect(pacingRowInCycle(-1)).toBe(lastRelease);

    expect(pacingPhaseAtTotalRows(0)).toBe('FLOW');
    expect(pacingPhaseAtTotalRows(lastFlow)).toBe('FLOW');
    expect(pacingPhaseAtTotalRows(firstTension)).toBe('TENSION');
    expect(pacingPhaseAtTotalRows(lastTension)).toBe('TENSION');
    expect(pacingPhaseAtTotalRows(firstClimax)).toBe('CLIMAX');
    expect(pacingPhaseAtTotalRows(lastClimax)).toBe('CLIMAX');
    expect(pacingPhaseAtTotalRows(firstRelease)).toBe('RELEASE');
    expect(pacingPhaseAtTotalRows(lastRelease)).toBe('RELEASE');
    expect(pacingPhaseAtTotalRows(C)).toBe('FLOW');
  });

  it('switches from CLIMAX to RELEASE with no off-by-one', () => {
    expect(pacingPhaseAtTotalRows(lastClimax)).toBe('CLIMAX');
    expect(pacingPhaseAtTotalRows(firstRelease)).toBe('RELEASE');
  });

  it('PacingDirector.consumeRowForNextGeneration advances phase in lockstep with counts', () => {
    const d = new PacingDirector();
    const phases: string[] = [];
    for (let i = 0; i < C + 1; i++) {
      phases.push(d.consumeRowForNextGeneration());
    }
    expect(phases[0]).toBe('FLOW');
    expect(phases[lastFlow]).toBe('FLOW');
    expect(phases[firstTension]).toBe('TENSION');
    expect(phases[lastClimax]).toBe('CLIMAX');
    expect(phases[firstRelease]).toBe('RELEASE');
    expect(phases[lastRelease]).toBe('RELEASE');
    expect(phases[C]).toBe('FLOW');
    expect(d.totalRowsGenerated).toBe(C + 1);
  });
});
