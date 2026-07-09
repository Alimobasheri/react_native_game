import { composePathChicane } from '@/Game/path/platformShaft/pathIntent/pathGenerators';
import { composePathChicaneShaft } from '@/Game/path/platformShaft/composePathChicaneShaft';
import {
  ceilingApproachLeadRowsForPin,
  ceilingPinIndices,
  shaftSideForPathRow,
} from '@/Game/path/platformShaft/shaftScheduler/stackTailPolicy';
import { platformShaftTuning } from '@/config/platformShaftTuning';

describe('hazard map diag seed 42', () => {
  it('prints stack hazard gaps', () => {
    const path = composePathChicane({ seed: 42, difficulty01: 0.2, columns: 6 });
    const result = composePathChicaneShaft({ seed: 42, difficulty01: 0.2, columns: 6 });
    const shaftStart = platformShaftTuning.PATH_SHAFT_START_ROW;
    const pins = ceilingPinIndices(path.pathRows);
    const defaultLead = platformShaftTuning.CEILING_PIN_LEAD_ROWS;
    const hazardRows = new Set<number>();
    for (const hz of result.hazards) {
      for (let r = hz.bounds.rowStart; r <= hz.bounds.rowEnd; r++) {
        hazardRows.add(r);
      }
    }

    let segSide: string | null = null;
    let segStart = -1;
    const segments: { start: number; end: number; side: string; hazardCount: number; skipped: number[] }[] = [];

    for (let i = shaftStart; i < result.rows.length; i++) {
      const side = shaftSideForPathRow(path.pathRows[i]!);
      if (segSide !== side) {
        if (segStart >= 0) {
          const skipped: number[] = [];
          let hc = 0;
          for (let r = segStart; r < i; r++) {
            if (hazardRows.has(r)) hc++;
            else skipped.push(r);
          }
          segments.push({ start: segStart, end: i - 1, side: segSide!, hazardCount: hc, skipped });
        }
        segStart = i;
        segSide = side;
      }
    }
    if (segStart >= 0 && segSide) {
      const skipped: number[] = [];
      let hc = 0;
      for (let r = segStart; r < result.rows.length; r++) {
        if (hazardRows.has(r)) hc++;
        else skipped.push(r);
      }
      segments.push({
        start: segStart,
        end: result.rows.length - 1,
        side: segSide,
        hazardCount: hc,
        skipped,
      });
    }

    // eslint-disable-next-line no-console
    console.log('skipped in stack', segments[0]?.skipped);

    for (const pinIdx of pins) {
      const pinLead = ceilingApproachLeadRowsForPin(path.pathRows[pinIdx]!, 6, defaultLead);
      const leadStart = Math.max(shaftStart, pinIdx - pinLead);
      expect(pinIdx - leadStart).toBeGreaterThanOrEqual(4);
    }

    expect(result.hazards.length).toBeGreaterThan(0);
  });
});
