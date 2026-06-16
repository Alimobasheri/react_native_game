import {
  getPacingCycleState,
  PacingDirector,
  pacingPhaseAtTotalRows,
  pacingRowInCycle,
  runEmbeddedPacingValidations,
  validateSeam,
} from '@/Game/path/pacingDirector';
import { pacingCycleLayoutFromCycleStart } from '@/config/gapDifficultyRamp';
import type { SwimmerRow } from '@/Game/path/swimmerGrid';

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

describe('PacingDirector phases (dynamic cycles)', () => {
  const layout0 = pacingCycleLayoutFromCycleStart(0);
  const C =
    layout0.flowRows + layout0.tensionRows + layout0.climaxRows + layout0.releaseRows;
  const lastFlow = layout0.flowRows - 1;
  const firstTension = layout0.flowRows;
  const lastTension = layout0.flowRows + layout0.tensionRows - 1;
  const firstClimax = layout0.flowRows + layout0.tensionRows;
  const lastClimax = layout0.flowRows + layout0.tensionRows + layout0.climaxRows - 1;
  const firstRelease = layout0.flowRows + layout0.tensionRows + layout0.climaxRows;
  const lastRelease = C - 1;

  it('first cycle length matches sum of phase row counts from ramp', () => {
    expect(C).toBe(getPacingCycleState(0).cycleTotalRows);
  });

  it('indexes cycle and phases from dynamic layout', () => {
    expect(pacingRowInCycle(0)).toBe(0);
    expect(pacingRowInCycle(lastRelease)).toBe(lastRelease);
    expect(pacingRowInCycle(C)).toBe(0);
    const L0 = pacingCycleLayoutFromCycleStart(0);
    const L0sum = L0.flowRows + L0.tensionRows + L0.climaxRows + L0.releaseRows;
    expect(pacingRowInCycle(-1)).toBe(L0sum - 1);

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

  it('second cycle can differ in total length from the first', () => {
    const L0 = getPacingCycleState(0).cycleTotalRows;
    const L1 = getPacingCycleState(L0).cycleTotalRows;
    expect(L1).toBeGreaterThan(0);
    expect(getPacingCycleState(L0).cycleStartTotalRows).toBe(L0);
    expect(getPacingCycleState(L0).rowInCycle).toBe(0);
    expect(getPacingCycleState(L0 + L1 - 1).rowInCycle).toBe(L1 - 1);
    expect(getPacingCycleState(L0 + L1).rowInCycle).toBe(0);
  });
});
