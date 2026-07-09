import { composePressIntroShaft } from '@/Game/path/platformShaft/composePressIntroShaft';
import {
  effectiveGapsAtFullPress,
  hazardForRowIndex,
  minGapWidthCols,
} from '@/Game/path/platformShaft/primitives';
import {
  applyPressEase,
  effectiveGapsAtPressPhase,
  gapColsClosedByPressForCollision,
  hazardAnimLocalSecFromBeatRow,
  pressExtentAtLocalSec,
  simPlatformPress,
} from '@/Game/hazards/platformPressMotion';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('platformPressMotion', () => {
  const columns = TEST_COLS;

  it('applyPressEase matches lab curves at endpoints', () => {
    expect(applyPressEase(0, 'ease-out')).toBe(0);
    expect(applyPressEase(1, 'ease-out')).toBe(1);
    expect(applyPressEase(0.5, 'linear')).toBe(0.5);
    expect(applyPressEase(0.5, 'ease-in')).toBeCloseTo(0.125);
    expect(applyPressEase(0.5, 'ease-out')).toBeCloseTo(0.875);
  });

  it('press extent grows with localSec and caps at pressCols', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards[0];
    const duration = hazard.params.pressDurationSec ?? 1.4;

    const atRest = pressExtentAtLocalSec(hazard, 0);
    expect(atRest.pressT).toBe(0);
    expect(atRest.pressExtent).toBe(0);

    const atFull = pressExtentAtLocalSec(hazard, duration * 2);
    expect(atFull.pressT).toBe(1);
    expect(atFull.pressExtent).toBe(hazard.params.pressCols ?? 1);
  });

  it('effectiveGapsAtPressPhase matches full press at large localSec', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    for (let rowIndex = 0; rowIndex < result.rows.length; rowIndex++) {
      const hazard = hazardForRowIndex(result.hazards, rowIndex);
      if (!hazard) continue;
      const baseGaps = result.rows[rowIndex].gaps;
      const fullPress = effectiveGapsAtFullPress(baseGaps, hazard, rowIndex, columns);
      const phased = effectiveGapsAtPressPhase(
        baseGaps,
        hazard,
        rowIndex,
        columns,
        999
      );
      expect(phased).toEqual(fullPress);
    }
  });

  it('partial press keeps wider gap than full press on slab rows', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards.find((h) => (h.params.pressCols ?? 1) >= 1);
    expect(hazard).toBeDefined();
    if (!hazard) return;
    const rowIndex = hazard.bounds.rowStart;
    const baseGaps = result.rows[rowIndex].gaps;
    const duration = hazard.params.pressDurationSec ?? 1.4;
    const partial = effectiveGapsAtPressPhase(
      baseGaps,
      hazard,
      rowIndex,
      columns,
      duration * 0.25
    );
    const full = effectiveGapsAtPressPhase(
      baseGaps,
      hazard,
      rowIndex,
      columns,
      duration * 2
    );
    expect(minGapWidthCols(partial)).toBeGreaterThanOrEqual(minGapWidthCols(full));
  });

  it('min gap stays >= 1 at sampled press phases on intro shaft', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const samples = [0, 0.25, 0.5, 0.75, 1, 2];
    for (let rowIndex = 0; rowIndex < result.rows.length; rowIndex++) {
      const hazard = hazardForRowIndex(result.hazards, rowIndex);
      if (!hazard) continue;
      const baseGaps = result.rows[rowIndex].gaps;
      const duration = hazard.params.pressDurationSec ?? 1.4;
      for (let i = 0; i < samples.length; i++) {
        const localSec = samples[i] * duration;
        const gaps = effectiveGapsAtPressPhase(
          baseGaps,
          hazard,
          rowIndex,
          columns,
          localSec
        );
        const gapW = minGapWidthCols(gaps);
        if (gapW > 0) {
          expect(gapW).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('gapColsClosedByPressForCollision stays empty at telegraph (pressExtent 0)', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards[0];
    const rowIndex = hazard.bounds.rowStart;
    const baseGaps = result.rows[rowIndex].gaps;
    const atTelegraph = simPlatformPress(hazard, columns, 0, rowIndex)!;
    expect(gapColsClosedByPressForCollision(baseGaps, atTelegraph)).toEqual([]);
  });

  it('effectiveGapsAtPressPhase preserves base gaps at telegraph', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards[0];
    const rowIndex = hazard.bounds.rowStart;
    const baseGaps = result.rows[rowIndex].gaps;
    expect(
      effectiveGapsAtPressPhase(baseGaps, hazard, rowIndex, columns, 0)
    ).toEqual(baseGaps);
  });

  it('gapColsClosedByPressForCollision does not close uninvaded corridor cols during partial press', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards[0];
    const rowIndex = hazard.bounds.rowStart;
    const baseGaps = result.rows[rowIndex].gaps;
    const duration = hazard.params.pressDurationSec ?? 1.4;
    const partialSim = simPlatformPress(hazard, columns, duration * 0.25, rowIndex)!;
    expect(partialSim.pressExtent).toBeGreaterThan(0);
    expect(partialSim.pressExtent).toBeLessThan(1);
    const closed = gapColsClosedByPressForCollision(baseGaps, partialSim);
    expect(closed).not.toContain(3);
  });

  it('gapColsClosedByPressForCollision closes invaded gap cols at full press', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards[0];
    const rowIndex = hazard.bounds.rowStart;
    const baseGaps = result.rows[rowIndex].gaps;
    const duration = hazard.params.pressDurationSec ?? 1.4;
    const fullSim = simPlatformPress(hazard, columns, duration * 2, rowIndex)!;
    expect(fullSim.pressExtent).toBeGreaterThanOrEqual(1);
    const closed = gapColsClosedByPressForCollision(baseGaps, fullSim);
    const narrowed = baseGaps.filter((c) => !closed.includes(c));
    expect(minGapWidthCols(narrowed)).toBeLessThan(minGapWidthCols(baseGaps));
    expect(closed.length).toBeGreaterThan(0);
  });

  it('simPlatformPress returns null outside hazard band', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards[0];
    expect(simPlatformPress(hazard, columns, 1, hazard.bounds.rowStart - 1)).toBeNull();
    expect(simPlatformPress(hazard, columns, 1, hazard.bounds.rowEnd + 1)).toBeNull();
  });

  it('hazardAnimLocalSecFromBeatRow is zero before animStartRow', () => {
    const result = composePressIntroShaft({ seed: 42, difficulty01: 0.4, columns });
    const hazard = result.hazards[0];
    const startRow = hazard.params.animStartRow ?? hazard.bounds.rowStart;
    const local = hazardAnimLocalSecFromBeatRow(
      hazard,
      startRow - 1,
      0.1,
      result.rows.length
    );
    expect(local).toBe(0);
  });
});
