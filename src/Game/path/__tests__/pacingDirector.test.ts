import {
  PacingDirector,
  pacingPhaseAtTotalRows,
  pacingRowInCycle,
  runEmbeddedPacingValidations,
  validateSeam,
} from '@/Game/path/pacingDirector';
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

describe('PacingDirector phases', () => {
  it('uses a 55-row cycle with FLOW=20, TENSION=15, CLIMAX=10, RELEASE=10', () => {
    expect(pacingRowInCycle(0)).toBe(0);
    expect(pacingRowInCycle(54)).toBe(54);
    expect(pacingRowInCycle(55)).toBe(0);
    expect(pacingRowInCycle(-1)).toBe(54);

    expect(pacingPhaseAtTotalRows(0)).toBe('FLOW');
    expect(pacingPhaseAtTotalRows(19)).toBe('FLOW');
    expect(pacingPhaseAtTotalRows(20)).toBe('TENSION');
    expect(pacingPhaseAtTotalRows(34)).toBe('TENSION');
    expect(pacingPhaseAtTotalRows(35)).toBe('CLIMAX');
    expect(pacingPhaseAtTotalRows(44)).toBe('CLIMAX');
    expect(pacingPhaseAtTotalRows(45)).toBe('RELEASE');
    expect(pacingPhaseAtTotalRows(54)).toBe('RELEASE');
    expect(pacingPhaseAtTotalRows(55)).toBe('FLOW');
  });

  it('switches from CLIMAX to RELEASE exactly at row 45 (no off-by-one)', () => {
    expect(pacingPhaseAtTotalRows(44)).toBe('CLIMAX');
    expect(pacingPhaseAtTotalRows(45)).toBe('RELEASE');
  });

  it('PacingDirector.consumeRowForNextGeneration advances phase in lockstep with counts', () => {
    const d = new PacingDirector();
    const phases: string[] = [];
    for (let i = 0; i < 56; i++) {
      phases.push(d.consumeRowForNextGeneration());
    }
    expect(phases[0]).toBe('FLOW');
    expect(phases[19]).toBe('FLOW');
    expect(phases[20]).toBe('TENSION');
    expect(phases[44]).toBe('CLIMAX');
    expect(phases[45]).toBe('RELEASE');
    expect(phases[54]).toBe('RELEASE');
    expect(phases[55]).toBe('FLOW');
    expect(d.totalRowsGenerated).toBe(56);
  });
});
