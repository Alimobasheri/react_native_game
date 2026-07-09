import { composePathChicane } from '@/Game/path/platformShaft/pathIntent/pathGenerators';
import {
  advanceGapCenterOnRunway,
  gapShiftBudgetExceeded,
  nextCenterConstraintRow,
  restCenterAtRow,
} from '@/Game/path/platformShaft/pathIntent/gapShiftPlan';
import { deriveShaftsFromPath } from '@/Game/path/platformShaft/shaftScheduler/deriveShafts';
import { planCornerStackFlow } from '@/Game/path/platformShaft/shaftScheduler/cornerStackFlowPlan';
import {
  gapCenterCol,
  passableGapsAtWaterBeat,
} from '@/Game/path/platformShaft/shaftScheduler/passagePlanner';
import { ceilingPinIndices } from '@/Game/path/platformShaft/shaftScheduler/stackTailPolicy';
import { effectiveGapsAtFullPress } from '@/Game/path/platformShaft/primitives';
import { restGapsFromPathRow } from '@/Game/path/platformShaft/pathIntent/ceilingPinPolicy';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

const BLOCK_HEIGHT = 60;
const RAISING_SPEED = 400;
const ROW_DUR = BLOCK_HEIGHT / RAISING_SPEED;

const deriveAt = (difficulty01: number) => {
  const path = composePathChicane({ seed: 42, difficulty01, columns: TEST_COLS });
  return {
    path,
    derived: deriveShaftsFromPath(path.pathRows, {
      columns: TEST_COLS,
      seed: 42,
      difficulty01,
      swimmerHeight: BLOCK_HEIGHT * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
      blockHeight: BLOCK_HEIGHT,
      raisingSpeed: RAISING_SPEED,
    }),
  };
};

describe('gapShiftPlan / deriveShafts directed flow', () => {
  it('seed 42 d=0.2: build reaches 1-col peak then release before pin', () => {
    const { path, derived } = deriveAt(0.2);
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    const pins = ceilingPinIndices(path.pathRows);
    const pinIdx = pins[0]!;
    const { rows: phases } = planCornerStackFlow(path.pathRows, {
      columns: TEST_COLS,
      shaftStartRow: shaftStart,
      wideGapCols: 4,
      difficulty01: 0.2,
      minResidualGapCols: platformShaftTuning.MIN_RESIDUAL_GAP_COLS,
    });

    const buildRows = phases
      .slice(shaftStart, pinIdx)
      .filter((p) => p.phase === 'escalate' || p.phase === 'peak');
    expect(buildRows.length).toBeGreaterThanOrEqual(3);

    let sawOneCol = false;
    for (let i = shaftStart; i < pinIdx; i++) {
      const hz = derived.hazards.find(
        (h) => i >= h.bounds.rowStart && i <= h.bounds.rowEnd
      );
      if (!hz) continue;
      const eff = effectiveGapsAtFullPress(derived.rows[i]!.gaps, hz, i, TEST_COLS);
      if (eff.length <= 1) sawOneCol = true;
    }
    expect(sawOneCol).toBe(true);

    const releaseRows = phases.slice(shaftStart, pinIdx).filter((p) => p.phase === 'deescalate');
    expect(releaseRows.length).toBeGreaterThan(0);

    const pinCenter = gapCenterCol(restGapsFromPathRow(path.pathRows[pinIdx]!, TEST_COLS));
    let achievable = gapCenterCol(derived.rows[shaftStart - 1]!.gaps);
    const rpc = platformShaftTuning.GAP_SHIFT_ROWS_PER_COL;
    for (let i = shaftStart; i < pinIdx; i++) {
      const hz = derived.hazards.find(
        (h) => i >= h.bounds.rowStart && i <= h.bounds.rowEnd
      );
      if (hz) {
        achievable = gapCenterCol(
          passableGapsAtWaterBeat(
            derived.rows[i]!.gaps,
            hz,
            path.pathRows[i]!.row,
            path.pathRows[i]!.row,
            ROW_DUR,
            TEST_COLS,
            derived.rows.length
          )
        );
      } else {
        achievable = advanceGapCenterOnRunway(
          achievable,
          restCenterAtRow(path.pathRows, i, TEST_COLS),
          rpc
        );
      }
    }
    expect(Math.abs(achievable - pinCenter)).toBeLessThanOrEqual(1.25);
  });

  it('higher difficulty still spawns shafts (not wall-only)', () => {
    const { derived: easy } = deriveAt(0.2);
    const { derived: hard } = deriveAt(0.85);
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    expect(easy.hazards.length).toBeGreaterThan(4);
    expect(hard.hazards.length).toBeGreaterThan(3);
    const hardBuild = planCornerStackFlow(
      composePathChicane({ seed: 42, difficulty01: 0.85, columns: TEST_COLS }).pathRows,
      {
        columns: TEST_COLS,
        shaftStartRow: shaftStart,
        wideGapCols: 3,
        difficulty01: 0.85,
        minResidualGapCols: 1,
      }
    ).rows.filter((p) => p.phase === 'escalate' || p.phase === 'peak');
    expect(hardBuild.length).toBeGreaterThan(0);
  });

  it('gapShiftBudgetExceeded flags tight drift before constraint', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: TEST_COLS });
    const pinIdx = ceilingPinIndices(path.pathRows)[0]!;
    const constraint = nextCenterConstraintRow(path.pathRows, pinIdx - 3, TEST_COLS);
    expect(constraint).toBe(pinIdx);
    const pinCenter = restCenterAtRow(path.pathRows, pinIdx, TEST_COLS);
    expect(
      gapShiftBudgetExceeded(path.pathRows, pinIdx - 2, 0, TEST_COLS, 3)
    ).toBe(true);
    expect(
      gapShiftBudgetExceeded(path.pathRows, pinIdx - 6, pinCenter, TEST_COLS, 3)
    ).toBe(false);
  });
});
