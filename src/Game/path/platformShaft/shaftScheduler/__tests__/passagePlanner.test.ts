import { composePathChicane } from '@/Game/path/platformShaft/pathIntent/pathGenerators';
import { composePathChicaneShaft } from '@/Game/path/platformShaft/composePathChicaneShaft';
import { deriveShaftsFromPath } from '@/Game/path/platformShaft/shaftScheduler/deriveShafts';
import { planCornerStackFlow } from '@/Game/path/platformShaft/shaftScheduler/cornerStackFlowPlan';
import {
  buildCorridorForPathRow,
  countGapOverlap,
  passableGapsAtWaterBeat,
  pickSurvivorCol,
} from '@/Game/path/platformShaft/shaftScheduler/passagePlanner';
import {
  maxOneSidedPressCols,
  pressWallCol,
} from '@/Game/path/platformShaft/primitives';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import { TEST_COLS, asPlatformSlabHazard, asPlatformSlabHazards } from '@/Game/path/__tests__/testGrid';

const BLOCK_HEIGHT = 60;
const RAISING_SPEED = 400;
const ROW_DUR = BLOCK_HEIGHT / RAISING_SPEED;

describe('passagePlanner / deriveShafts', () => {
  it('runway rows frame outer walls (cols 0 and 5 blocked)', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const derived = deriveShaftsFromPath(path.pathRows, {
      columns: TEST_COLS,
      seed: 42,
      difficulty01: 0.2,
      swimmerHeight: BLOCK_HEIGHT * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
      blockHeight: BLOCK_HEIGHT,
      raisingSpeed: RAISING_SPEED,
    });
    const start = platformShaftTuning.PATH_SHAFT_START_ROW;
    for (let i = 0; i < start; i++) {
      const blocks = derived.rows[i]!.blocks;
      expect(blocks).toContain(0);
      expect(blocks).toContain(TEST_COLS - 1);
    }
  });

  it('each shaft row has timed overlap with prev row at arrival beat (SH-005)', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const derived = deriveShaftsFromPath(path.pathRows, {
      columns: TEST_COLS,
      seed: 42,
      difficulty01: 0.2,
      swimmerHeight: BLOCK_HEIGHT * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
      blockHeight: BLOCK_HEIGHT,
      raisingSpeed: RAISING_SPEED,
    });

    let prevHazard: (typeof derived.hazards)[0] | undefined;
    let prevGaps = derived.rows[0]!.gaps;
    let prevRowIndex = path.pathRows[0]!.row;

    for (let i = 1; i < derived.rows.length; i++) {
      const beatRow = path.pathRows[i]!.row;
      const prevPassable = passableGapsAtWaterBeat(
        prevGaps,
        prevHazard,
        prevRowIndex,
        beatRow,
        ROW_DUR,
        TEST_COLS,
        derived.rows.length
      );
      const hz = derived.hazards.find(
        (h) => i >= h.bounds.rowStart && i <= h.bounds.rowEnd
      );
      if (hz) {
        const arrive = passableGapsAtWaterBeat(
          derived.rows[i]!.gaps,
          hz,
          beatRow,
          beatRow,
          ROW_DUR,
          TEST_COLS,
          derived.rows.length
        );
        expect(countGapOverlap(arrive, prevPassable)).toBeGreaterThanOrEqual(1);
      }
      prevHazard = hz;
      prevGaps = derived.rows[i]!.gaps;
      prevRowIndex = beatRow;
    }
  });

  it('depart beat overlaps next static corridor when next row exists', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const derived = deriveShaftsFromPath(path.pathRows, {
      columns: TEST_COLS,
      seed: 42,
      difficulty01: 0.2,
      swimmerHeight: BLOCK_HEIGHT * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
      blockHeight: BLOCK_HEIGHT,
      raisingSpeed: RAISING_SPEED,
    });

    for (let i = 0; i < derived.rows.length - 1; i++) {
      const hz = derived.hazards.find(
        (h) => i >= h.bounds.rowStart && i <= h.bounds.rowEnd
      );
      if (!hz) continue;
      const departBeat = path.pathRows[i + 1]!.row;
      const depart = passableGapsAtWaterBeat(
        derived.rows[i]!.gaps,
        hz,
        path.pathRows[i]!.row,
        departBeat,
        ROW_DUR,
        TEST_COLS,
        derived.rows.length
      );
      const nextGaps = derived.rows[i + 1]!.gaps;
      expect(countGapOverlap(depart, nextGaps)).toBeGreaterThanOrEqual(1);
    }
  });

  it('segment tail corridor shift keeps release runway before shift (seed 42)', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    const minOpen = platformShaftTuning.GAP_SHIFT_MIN_OPEN_COLS;

    const derived = deriveShaftsFromPath(path.pathRows, {
      columns: TEST_COLS,
      seed: 42,
      difficulty01: 0.2,
      swimmerHeight: BLOCK_HEIGHT * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
      blockHeight: BLOCK_HEIGHT,
      raisingSpeed: RAISING_SPEED,
    });

    const { rows: phases } = planCornerStackFlow(path.pathRows, {
      columns: TEST_COLS,
      shaftStartRow: shaftStart,
      wideGapCols: 4,
      difficulty01: 0.2,
      minResidualGapCols: platformShaftTuning.MIN_RESIDUAL_GAP_COLS,
    });

    // Segment tail: path center shifts at row 35 — rows 31-34 are deescalate/gap_shift_runway.
    for (let i = 31; i < 35; i++) {
      expect(['deescalate', 'gap_shift_runway']).toContain(phases[i]!.phase);
      expect(derived.rows[i]!.gaps.length).toBeGreaterThanOrEqual(minOpen);
    }
    expect(shaftStart).toBeLessThan(31);
  });

  it('explicit shaftSide beats old midpoint inference when deriving hazards', () => {
    const path = composePathChicane({
      seed: 42,
      difficulty01: 0.2,
      columns: TEST_COLS,
      applyCeilingPins: false,
    });
    const derived = deriveShaftsFromPath(path.pathRows, {
      columns: TEST_COLS,
      seed: 42,
      difficulty01: 0.2,
      swimmerHeight: BLOCK_HEIGHT * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
      blockHeight: BLOCK_HEIGHT,
      raisingSpeed: RAISING_SPEED,
    });
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    const conflictingHazard = derived.hazards.find((hazard) => {
      if (hazard.bounds.rowStart < shaftStart) return false;
      const row = path.pathRows[hazard.bounds.rowStart]!;
      const oldInferred =
        (Math.min(...row.narrowGaps) + Math.max(...row.narrowGaps)) / 2 >=
          (Math.min(...row.wideGaps) + Math.max(...row.wideGaps)) / 2
          ? 'left'
          : 'right';
      return row.shaftSide !== oldInferred;
    });

    expect(conflictingHazard).toBeDefined();
    const row = path.pathRows[conflictingHazard!.bounds.rowStart]!;
    expect(row.shaftSide).toBe('left');
    expect(conflictingHazard!.side).toBe(row.shaftSide);
  });

  it('shaft rows reserve the hazard anchor lane instead of blocking it statically', () => {
    const path = composePathChicane({
      seed: 42,
      difficulty01: 0.2,
      columns: TEST_COLS,
    });
    const derived = deriveShaftsFromPath(path.pathRows, {
      columns: TEST_COLS,
      seed: 42,
      difficulty01: 0.2,
      swimmerHeight: BLOCK_HEIGHT * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
      blockHeight: BLOCK_HEIGHT,
      raisingSpeed: RAISING_SPEED,
    });

    for (const hazard of derived.hazards) {
      const wallCol = hazard.side === 'left' ? 1 : TEST_COLS - 2;
      const row = derived.rows[hazard.bounds.rowStart]!;
      expect(row.gaps).toContain(wallCol);
      expect(row.blocks ?? []).not.toContain(wallCol);
    }
  });

  it('pickSurvivorCol keeps geomMax>=1 after right-crush into a left hard corridor', () => {
    const corridor = buildCorridorForPathRow(TEST_COLS, 3, 3, 'left');
    expect(corridor.gaps).toEqual([1, 2, 3, 4]);
    // Prev residual near the steel wall would greedily pick col 1/2 (geomMax=0).
    // Expands to pressable far-wall candidates so left shafts can still place.
    const survivor = pickSurvivorCol(corridor.gaps, [1, 2], 'left', false, TEST_COLS);
    expect(maxOneSidedPressCols(corridor.gaps, [survivor], 'left', TEST_COLS)).toBeGreaterThanOrEqual(
      1
    );
    expect(survivor).toBeGreaterThanOrEqual(3);
  });

  it('d=0.8 places both left and right shafts without passage skips on authored steel rows', () => {
    const path = composePathChicane({
      seed: 12,
      difficulty01: 0.8,
      columns: TEST_COLS,
      applyCeilingPins: false,
    });
    const result = composePathChicaneShaft({
      seed: 12,
      difficulty01: 0.8,
      columns: TEST_COLS,
    });
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    const slabs = asPlatformSlabHazards(result.hazards);
    const left = slabs.filter((h) => h.side === 'left').length;
    const right = slabs.filter((h) => h.side === 'right').length;
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);

    const skipWarns = (result.harmonizerWarnings ?? []).filter((w) =>
      w.includes('no pressCols satisfy passage')
    );
    // Non-runway authored shaft sides should place; skip warnings must not dominate left stretch.
    expect(skipWarns.length).toBeLessThan(result.hazards.length);

    for (const hazard of asPlatformSlabHazards(result.hazards)) {
      if (hazard.bounds.rowStart < shaftStart) continue;
      const wallCol = pressWallCol(TEST_COLS, hazard.side);
      const row = result.rows[hazard.bounds.rowStart]!;
      expect(path.pathRows[hazard.bounds.rowStart]!.shaftSide).toBe(hazard.side);
      expect(row.gaps).toContain(wallCol);
      expect(row.blocks ?? []).not.toContain(wallCol);
    }
  });
});
