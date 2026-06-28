import { runProgressionTuning } from '@/config/runProgression';
import { extractTripleGapCenter } from '@/Game/path/flowGenerators';
import { generateFlowOpeningRowGaps } from '@/Game/path/flowOpeningRows';
import { validateSeam } from '@/Game/path/pacingDirector';
import type { OpeningArchetype } from '@/Game/path/runBlueprint';
import { rowFromGaps } from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

function simulateOpeningRows(
  archetype: OpeningArchetype,
  runSeed: number,
  rowCount: number,
  pathRunId = runSeed
): number[][] {
  const ctx: Record<string, unknown> = {
    openingArchetype: archetype,
    baseRunSeed: runSeed,
  };
  const gapRows: number[][] = [];
  let prevSw = null as ReturnType<typeof rowFromGaps> | null;

  for (let stream = 0; stream < rowCount; stream++) {
    const gaps = generateFlowOpeningRowGaps(
      ctx,
      prevSw,
      TEST_COLS,
      stream,
      pathRunId,
      archetype,
      runSeed
    );
    gapRows.push(gaps);
    prevSw = rowFromGaps(gaps, TEST_COLS);
  }
  return gapRows;
}

describe('generateFlowOpeningRowGaps', () => {
  it('warmChute seeds centered corridor on first row', () => {
    const rows = simulateOpeningRows('warmChute', 1, 1);
    expect(extractTripleGapCenter(rowFromGaps(rows[0], TEST_COLS), TEST_COLS)).toBe(4);
  });

  it('leftBias first row center is in left range', () => {
    const rows = simulateOpeningRows('leftBias', 42, 1);
    const center = extractTripleGapCenter(rowFromGaps(rows[0], TEST_COLS), TEST_COLS)!;
    expect(center).toBeGreaterThanOrEqual(1);
    expect(center).toBeLessThanOrEqual(2);
  });

  it('rightBias first row center is in right range', () => {
    const rows = simulateOpeningRows('rightBias', 42, 1);
    const center = extractTripleGapCenter(rowFromGaps(rows[0], TEST_COLS), TEST_COLS)!;
    expect(center).toBeGreaterThanOrEqual(5);
    expect(center).toBeLessThanOrEqual(6);
  });

  it('fastChicane enters chicane by cap row', () => {
    const runSeed = 99;
    const ctx: Record<string, unknown> = {};
    let prevSw = null as ReturnType<typeof rowFromGaps> | null;
    let chicaneBy = -1;

    for (let stream = 0; stream < 8; stream++) {
      const gaps = generateFlowOpeningRowGaps(
        ctx,
        prevSw,
        TEST_COLS,
        stream,
        runSeed,
        'fastChicane',
        runSeed
      );
      if (ctx.flowMode === 'chicane' && chicaneBy < 0) {
        chicaneBy = stream + 1;
      }
      prevSw = rowFromGaps(gaps, TEST_COLS);
    }

    expect(chicaneBy).toBeGreaterThanOrEqual(3);
    expect(chicaneBy).toBeLessThanOrEqual(5);
  });

  it('maintains valid seams for 20 rows per archetype', () => {
    const archetypes: OpeningArchetype[] = [
      'warmChute',
      'leftBias',
      'rightBias',
      'fastChicane',
    ];
    for (const archetype of archetypes) {
      const rows = simulateOpeningRows(archetype, 777, 20);
      for (let i = 1; i < rows.length; i++) {
        expect(
          validateSeam(rowFromGaps(rows[i - 1], TEST_COLS), rowFromGaps(rows[i], TEST_COLS))
        ).toBe(true);
      }
    }
  });

  it('is deterministic for the same runSeed and archetype', () => {
    const a = simulateOpeningRows('leftBias', 555, 10);
    const b = simulateOpeningRows('leftBias', 555, 10);
    expect(a).toEqual(b);
  });

  it('opening budget handoff row still validates seam at row boundary', () => {
    const max = runProgressionTuning.OPENING_ARCHETYPE_MAX_ROWS;
    const rows = simulateOpeningRows('fastChicane', 123, max + 1);
    expect(
      validateSeam(
        rowFromGaps(rows[max - 2], TEST_COLS),
        rowFromGaps(rows[max - 1], TEST_COLS)
      )
    ).toBe(true);
  });

  it('breather stays in chute for full opening budget rows', () => {
    const max = runProgressionTuning.OPENING_ARCHETYPE_MAX_ROWS;
    const ctx: Record<string, unknown> = {};
    let prevSw = null as ReturnType<typeof rowFromGaps> | null;

    for (let stream = 0; stream < max; stream++) {
      const gaps = generateFlowOpeningRowGaps(
        ctx,
        prevSw,
        TEST_COLS,
        stream,
        42,
        'breather',
        42
      );
      if (stream < max - 1) {
        expect(ctx.flowMode).not.toBe('chicane');
      }
      prevSw = rowFromGaps(gaps, TEST_COLS);
    }
    expect((ctx.flowChuteRowCount as number) ?? 0).toBe(max);
  });

  it('breather maintains valid seams across opening budget', () => {
    const max = runProgressionTuning.OPENING_ARCHETYPE_MAX_ROWS;
    const rows = simulateOpeningRows('breather', 888, max);
    for (let i = 1; i < rows.length; i++) {
      expect(
        validateSeam(rowFromGaps(rows[i - 1], TEST_COLS), rowFromGaps(rows[i], TEST_COLS))
      ).toBe(true);
    }
  });
});
