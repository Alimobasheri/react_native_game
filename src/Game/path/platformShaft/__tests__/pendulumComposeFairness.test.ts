import { pendulumSweep } from '@/Game/path/platformShaft/recipes/pendulumSweep';
import { pendulumCross } from '@/Game/path/platformShaft/recipes/pendulumCross';
import { pendulumHazardTuning } from '@/config/pendulumHazardTuning';

const rowsWithSideWalls = (rows: { blocks: number[] }[]) =>
  rows.filter((row) => row.blocks.includes(0) && row.blocks.includes(5));

describe('pendulumComposeFairness', () => {
  it('pendulumSweep includes runway, approach walls, band walls, and pendulum hazard', () => {
    const out = pendulumSweep({ columns: 6, seed: 1, difficulty01: 0.5 });
    expect(out.hazards.length).toBe(1);
    expect(out.hazards[0].kind).toBe('hazard_pendulum');
    expect(out.rows.length).toBeGreaterThan(pendulumHazardTuning.MIN_RUNWAY_ROWS);

    const walledRows = rowsWithSideWalls(out.rows);
    expect(walledRows.length).toBeGreaterThanOrEqual(
      pendulumHazardTuning.PENDULUM_BAND_ROW_SPAN + 2
    );

    const hazard = out.hazards[0];
    if (hazard.kind !== 'hazard_pendulum') {
      throw new Error('expected pendulum hazard');
    }
    const anchorRow = out.rows[hazard.bounds.rowStart];
    expect(anchorRow.blocks).toContain(hazard.params.anchorCol);
  });

  it('pendulumCross spawns dual hazards with pi phase offset', () => {
    const out = pendulumCross({ columns: 6, seed: 2, difficulty01: 0.65 });
    const pendulums = out.hazards.filter((h) => h.kind === 'hazard_pendulum');
    expect(pendulums.length).toBe(2);
    const phases = pendulums.map((h) =>
      h.kind === 'hazard_pendulum' ? h.params.phaseOffsetRads : 0
    );
    expect(phases).toContain(0);
    expect(phases).toContain(Math.PI);
  });
});
