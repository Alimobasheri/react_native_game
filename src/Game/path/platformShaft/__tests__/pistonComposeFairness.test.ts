import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import { pistonFloor } from '@/Game/path/platformShaft/recipes/pistonFloor';
import { pistonCeiling } from '@/Game/path/platformShaft/recipes/pistonCeiling';

const rowsWithSideWalls = (rows: { blocks?: number[] }[]) =>
  rows.filter(
    (row) =>
      row.blocks?.includes(0) === true && row.blocks?.includes(5) === true
  );

describe('pistonComposeFairness', () => {
  it('pistonFloor includes runway, mount block, clearance, and piston hazard', () => {
    const out = pistonFloor({ columns: 6, seed: 1, difficulty01: 0.5 });
    expect(out.hazards.length).toBe(1);
    expect(out.hazards[0].kind).toBe('hazard_piston');
    expect(out.rows.length).toBeGreaterThan(pistonHazardTuning.MIN_RUNWAY_ROWS);

    const hazard = out.hazards[0];
    if (hazard.kind !== 'hazard_piston') {
      throw new Error('expected piston hazard');
    }
    expect(hazard.params.mount).toBe('floor');
    expect(hazard.params.column).toBeGreaterThanOrEqual(
      pistonHazardTuning.MIN_COLUMN
    );
    expect(hazard.params.column).toBeLessThanOrEqual(
      pistonHazardTuning.MAX_COLUMN
    );

    const mountRow = out.rows[hazard.bounds.rowStart];
    expect(mountRow.blocks).toContain(hazard.params.column);

    const escapeCol =
      hazard.params.safeExitSide === 'left'
        ? hazard.params.column - 1
        : hazard.params.column + 1;
    for (let r = hazard.bounds.rowStart; r <= hazard.bounds.rowEnd; r++) {
      expect(out.rows[r].gaps).toContain(escapeCol);
    }

    const walled = rowsWithSideWalls(out.rows);
    expect(walled.length).toBeGreaterThanOrEqual(
      pistonHazardTuning.APPROACH_WALL_ROWS + 1
    );
  });

  it('pistonCeiling mounts on the top band row and keeps escape column open', () => {
    const out = pistonCeiling({ columns: 6, seed: 2, difficulty01: 0.55 });
    const hazard = out.hazards[0];
    if (hazard.kind !== 'hazard_piston') {
      throw new Error('expected piston hazard');
    }
    expect(hazard.params.mount).toBe('ceiling');
    const mountRow = out.rows[hazard.bounds.rowEnd];
    expect(mountRow.blocks).toContain(hazard.params.column);
  });

  it('never places piston column on outer walls', () => {
    for (const difficulty01 of [0.35, 0.6, 0.9]) {
      const floor = pistonFloor({ columns: 6, seed: 7, difficulty01 });
      const ceil = pistonCeiling({ columns: 6, seed: 8, difficulty01 });
      for (const out of [floor, ceil]) {
        for (const hz of out.hazards) {
          if (hz.kind !== 'hazard_piston') continue;
          expect(hz.params.column).toBeGreaterThanOrEqual(1);
          expect(hz.params.column).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('keeps clearance rows beyond stroke and a RELEASE runway after the band', () => {
    const out = pistonFloor({ columns: 6, seed: 3, difficulty01: 0.5 });
    const hazard = out.hazards[0];
    if (hazard.kind !== 'hazard_piston') {
      throw new Error('expected piston hazard');
    }
    const afterBand = out.rows.length - (hazard.bounds.rowEnd + 1);
    expect(afterBand).toBeGreaterThanOrEqual(
      pistonHazardTuning.MIN_CLEARANCE_ROWS_BEYOND_STROKE +
        pistonHazardTuning.POST_PISTON_RELEASE_ROWS
    );
    // Clearance: mount column must be open in rows immediately beyond band tip.
    for (
      let r = hazard.bounds.rowEnd + 1;
      r <=
      hazard.bounds.rowEnd + pistonHazardTuning.MIN_CLEARANCE_ROWS_BEYOND_STROKE;
      r++
    ) {
      expect(out.rows[r].gaps).toContain(hazard.params.column);
    }
  });
});
