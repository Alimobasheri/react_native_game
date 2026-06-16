/**
 * Deterministic Swimmer path preview — ports game logic from:
 * deterministicMix, gapDifficultyRamp, macroPacing, proceduralGaps, tensionGenerators,
 * climaxGenerators (pinball + false wall), releaseGenerators, flowGenerators.
 * Keep in sync with src/ when tuning changes.
 */
(function (global) {
  "use strict";

  const TENSION_FUNNEL_START_WIDTH = 5;
  const TENSION_FUNNEL_MIN_DURATION = 5;
  const CLIMAX_PINBALL_CYCLE_LEN = 4; // legacy hint; pinball cycles are driftCount + 1 in code paths below
  const CLIMAX_FALSE_CAVERN_LO = 2;
  const CLIMAX_FALSE_CAVERN_HI = 12;
  const CHICANE_BLOCK_N = 9;
  /** Sync with `Layout.ts` LAYOUT_CONSTANTS.COLUMNS for false-wall runway math. */
  const LAYOUT_COLUMNS = 9;
  const FALSE_WALL_MIN_CAVERN_ROWS = LAYOUT_COLUMNS - 2;
  const FALSE_WALL_MIN_PHASE_ROWS = FALSE_WALL_MIN_CAVERN_ROWS + 1;

  const defaultGapTuning = () => ({
    ROWS_FOR_FULL_RAMP: 2400,
    CURVE_EXPONENT: 0.55,
    RUNWAY_DUP_ROWS_START_MIN: 7,
    RUNWAY_DUP_ROWS_START_MAX: 10,
    RUNWAY_DUP_ROWS_END_MIN: 0,
    RUNWAY_DUP_ROWS_END_MAX: 4,
    MULTIPATH_MIN_GAP_COLS_START_MIN: 4,
    MULTIPATH_MIN_GAP_COLS_START_MAX: 6,
    MULTIPATH_MIN_GAP_COLS_END_MIN: 1,
    MULTIPATH_MIN_GAP_COLS_END_MAX: 3,
    MULTIPATH_MAX_GAP_COLS_CAP_START_MIN: 8,
    MULTIPATH_MAX_GAP_COLS_CAP_START_MAX: 10,
    MULTIPATH_MAX_GAP_COLS_CAP_END_MIN: 5,
    MULTIPATH_MAX_GAP_COLS_CAP_END_MAX: 7,
    ROW_LENGTH_WIDTH_FRAC_START_MIN: 0.85,
    ROW_LENGTH_WIDTH_FRAC_START_MAX: 0.95,
    ROW_LENGTH_WIDTH_FRAC_END_MIN: 0.45,
    ROW_LENGTH_WIDTH_FRAC_END_MAX: 0.55,
    SINGLE_PATH_INCLUDE_ADJACENT_UNTIL_DIFFICULTY: 0.55,
    MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START: 0.55,
    MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_END: 0.82,
    TENSION_FUNNEL_ROWS_START_MIN: 5,
    TENSION_FUNNEL_ROWS_START_MAX: 7,
    TENSION_FUNNEL_ROWS_END_MIN: 8,
    TENSION_FUNNEL_ROWS_END_MAX: 12,
    CLIMAX_PINBALL_SEGMENT_ROWS_START_MIN: 6,
    CLIMAX_PINBALL_SEGMENT_ROWS_START_MAX: 9,
    CLIMAX_PINBALL_SEGMENT_ROWS_END_MIN: 10,
    CLIMAX_PINBALL_SEGMENT_ROWS_END_MAX: 16,
    CLIMAX_FALSE_WALL_ROWS_START_MIN: 4,
    CLIMAX_FALSE_WALL_ROWS_START_MAX: 5,
    CLIMAX_FALSE_WALL_ROWS_END_MIN: 5,
    CLIMAX_FALSE_WALL_ROWS_END_MAX: 8,
    FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MIN: 14,
    FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MAX: 20,
    FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MIN: 22,
    FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MAX: 32,
    RELEASE_REST_ZONE_ROWS_START_MIN: 6,
    RELEASE_REST_ZONE_ROWS_START_MAX: 10,
    RELEASE_REST_ZONE_ROWS_END_MIN: 12,
    RELEASE_REST_ZONE_ROWS_END_MAX: 18,

    FLOW_PHASE_ROWS_START_MIN: 22,
    FLOW_PHASE_ROWS_START_MAX: 34,
    FLOW_PHASE_ROWS_END_MIN: 28,
    FLOW_PHASE_ROWS_END_MAX: 42,
    FLOW_PHASE_ROWS_HARD_MIN: 12,

    TENSION_PHASE_ROWS_START_MIN: 14,
    TENSION_PHASE_ROWS_START_MAX: 22,
    TENSION_PHASE_ROWS_END_MIN: 18,
    TENSION_PHASE_ROWS_END_MAX: 28,
    TENSION_PHASE_ROWS_HARD_MIN: 10,

    CLIMAX_PHASE_ROWS_START_MIN: 10,
    CLIMAX_PHASE_ROWS_START_MAX: 16,
    CLIMAX_PHASE_ROWS_END_MIN: 14,
    CLIMAX_PHASE_ROWS_END_MAX: 22,
    CLIMAX_PHASE_ROWS_HARD_MIN: 10,

    RELEASE_PHASE_ROWS_START_MIN: 10,
    RELEASE_PHASE_ROWS_START_MAX: 16,
    RELEASE_PHASE_ROWS_END_MIN: 14,
    RELEASE_PHASE_ROWS_END_MAX: 22,
    RELEASE_PHASE_ROWS_HARD_MIN: 8,
  });

  function mixU32(a, b, c) {
    let x = (a >>> 0) ^ (Math.imul(b >>> 0, 0x9e3779b1) >>> 0) ^ (Math.imul(c >>> 0, 0x85ebca6b) >>> 0);
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
    return x >>> 0;
  }

  function mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, salt) {
    const stream = proceduralStreamSalt >>> 0;
    return mixU32(mixU32(pathRunId, stream, 0x4e16b5e5), rowIndex, salt);
  }

  function unitFloatFromU32(x) {
    return ((x >>> 0) & 0xffffff) / 0x1000000;
  }

  function intMod(x, mod) {
    if (mod <= 0) return 0;
    return ((Math.abs(x >>> 0) % mod) + mod) % mod;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function clampInt(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  function macroPhaseTension01(phase) {
    switch (phase) {
      case "flow":
        return 0.2;
      case "tension":
        return 0.55;
      case "climax":
        return 0.85;
      case "release":
        return 0.35;
      default:
        return 0.4;
    }
  }

  function obstaclePacingRunDepthDivisorFromTuning(tuning) {
    return Math.max(1, tuning.ROWS_FOR_FULL_RAMP || 2400) * 10;
  }

  function runDepthTensionBonus01(tuning, rowsSpawnedBeforeThis) {
    const r = rowsSpawnedBeforeThis >>> 0;
    const denom = Math.max(1, obstaclePacingRunDepthDivisorFromTuning(tuning));
    const raw = r / denom;
    return raw > 0.34 ? 0.34 : raw;
  }

  function effectiveGapTension01(tuning, phase, rowsSpawnedBeforeThis) {
    const base = macroPhaseTension01(phase);
    const bonus = runDepthTensionBonus01(tuning, rowsSpawnedBeforeThis);
    const sum = base + bonus;
    return sum > 1 ? 1 : sum;
  }

  function gapDifficulty01FromTotalRows(tuning, totalRowsGenerated) {
    const span = tuning.ROWS_FOR_FULL_RAMP;
    if (span <= 0) return 1;
    const p = clamp(totalRowsGenerated / span, 0, 1);
    const e = tuning.CURVE_EXPONENT;
    return Math.pow(p, e);
  }

  function lerpNum(a, b, d) {
    return a + (b - a) * d;
  }

  function intInclusiveFromU32(u, lo, hi) {
    const a = Math.min(lo, hi);
    const b = Math.max(lo, hi);
    const span = b - a + 1;
    if (span <= 1) return a;
    return a + intMod(u, span);
  }

  function intFromRampedRange(d, startMin, startMax, endMin, endMax, pickU32) {
    const loRounded = Math.round(lerpNum(startMin, endMin, d));
    const hiRounded = Math.round(lerpNum(startMax, endMax, d));
    const lo = Math.min(loRounded, hiRounded);
    const hi = Math.max(loRounded, hiRounded);
    return intInclusiveFromU32(pickU32 >>> 0, lo, hi);
  }

  function pacingCycleLayoutFromCycleStart(tuning, cycleStartTotalRows) {
    const d = gapDifficulty01FromTotalRows(tuning, cycleStartTotalRows);
    const t = tuning;
    const s = Math.floor(Math.max(0, cycleStartTotalRows));
    const flowRows = Math.max(
      t.FLOW_PHASE_ROWS_HARD_MIN,
      intFromRampedRange(
        d,
        t.FLOW_PHASE_ROWS_START_MIN,
        t.FLOW_PHASE_ROWS_START_MAX,
        t.FLOW_PHASE_ROWS_END_MIN,
        t.FLOW_PHASE_ROWS_END_MAX,
        mixU32(s >>> 0, 0x50414301, 0xf00d)
      )
    );
    const tensionRows = Math.max(
      t.TENSION_PHASE_ROWS_HARD_MIN,
      intFromRampedRange(
        d,
        t.TENSION_PHASE_ROWS_START_MIN,
        t.TENSION_PHASE_ROWS_START_MAX,
        t.TENSION_PHASE_ROWS_END_MIN,
        t.TENSION_PHASE_ROWS_END_MAX,
        mixU32(s >>> 0, 0x50414302, 0xf00d)
      )
    );
    const climaxRows = Math.max(
      t.CLIMAX_PHASE_ROWS_HARD_MIN,
      intFromRampedRange(
        d,
        t.CLIMAX_PHASE_ROWS_START_MIN,
        t.CLIMAX_PHASE_ROWS_START_MAX,
        t.CLIMAX_PHASE_ROWS_END_MIN,
        t.CLIMAX_PHASE_ROWS_END_MAX,
        mixU32(s >>> 0, 0x50414303, 0xf00d)
      )
    );
    const releaseRows = Math.max(
      t.RELEASE_PHASE_ROWS_HARD_MIN,
      intFromRampedRange(
        d,
        t.RELEASE_PHASE_ROWS_START_MIN,
        t.RELEASE_PHASE_ROWS_START_MAX,
        t.RELEASE_PHASE_ROWS_END_MIN,
        t.RELEASE_PHASE_ROWS_END_MAX,
        mixU32(s >>> 0, 0x50414304, 0xf00d)
      )
    );
    return { flowRows, tensionRows, climaxRows, releaseRows };
  }

  function getPacingCycleState(tuning, totalRowsGenerated) {
    const tr = Math.floor(Math.max(0, totalRowsGenerated));
    let cursor = 0;
    for (let guard = 0; guard < 500000; guard++) {
      const layout = pacingCycleLayoutFromCycleStart(tuning, cursor);
      const L = layout.flowRows + layout.tensionRows + layout.climaxRows + layout.releaseRows;
      if (L <= 0) {
        const fb = pacingCycleLayoutFromCycleStart(tuning, 0);
        const L0 = fb.flowRows + fb.tensionRows + fb.climaxRows + fb.releaseRows;
        return {
          ...fb,
          cycleStartTotalRows: 0,
          rowInCycle: Math.min(tr, Math.max(0, L0 - 1)),
          cycleTotalRows: Math.max(1, L0),
        };
      }
      if (tr < cursor + L) {
        return {
          ...layout,
          cycleStartTotalRows: cursor,
          rowInCycle: tr - cursor,
          cycleTotalRows: L,
        };
      }
      cursor += L;
    }
    const fb = pacingCycleLayoutFromCycleStart(tuning, 0);
    const L0 = fb.flowRows + fb.tensionRows + fb.climaxRows + fb.releaseRows;
    return { ...fb, cycleStartTotalRows: 0, rowInCycle: 0, cycleTotalRows: Math.max(1, L0) };
  }

  function pacingMacroLowerAtTr(tuning, tr) {
    const st = getPacingCycleState(tuning, tr);
    const r = st.rowInCycle;
    if (r < st.flowRows) return "flow";
    if (r < st.flowRows + st.tensionRows) return "tension";
    if (r < st.flowRows + st.tensionRows + st.climaxRows) return "climax";
    return "release";
  }

  function rowParamSubmix(rowStreamSeed, tag) {
    return mixU32(rowStreamSeed >>> 0, tag >>> 0, 0xb5297a4d);
  }

  function pathSegmentIntClamped(tuning, d, startMin, startMax, endMin, endMax, pickU32, hardMin, hardMax) {
    const v = intFromRampedRange(d, startMin, startMax, endMin, endMax, pickU32);
    return Math.max(hardMin, Math.min(hardMax, v));
  }

  function pathSegmentTensionFunnelDurationRows(tuning, totalRows, varianceU32, tensionPhaseRowBudget) {
    const d = gapDifficulty01FromTotalRows(tuning, totalRows);
    let v = pathSegmentIntClamped(
      tuning,
      d,
      tuning.TENSION_FUNNEL_ROWS_START_MIN,
      tuning.TENSION_FUNNEL_ROWS_START_MAX,
      tuning.TENSION_FUNNEL_ROWS_END_MIN,
      tuning.TENSION_FUNNEL_ROWS_END_MAX,
      varianceU32,
      TENSION_FUNNEL_MIN_DURATION,
      24
    );
    if (tensionPhaseRowBudget != null && Number.isFinite(tensionPhaseRowBudget)) {
      const cap = Math.max(TENSION_FUNNEL_MIN_DURATION, Math.floor(tensionPhaseRowBudget) - 6);
      v = Math.min(v, cap);
    }
    return v;
  }

  function pathSegmentClimaxPinballSegmentRows(tuning, totalRows, varianceU32, climaxPhaseRowBudget) {
    const d = gapDifficulty01FromTotalRows(tuning, totalRows);
    let v = pathSegmentIntClamped(
      tuning,
      d,
      tuning.CLIMAX_PINBALL_SEGMENT_ROWS_START_MIN,
      tuning.CLIMAX_PINBALL_SEGMENT_ROWS_START_MAX,
      tuning.CLIMAX_PINBALL_SEGMENT_ROWS_END_MIN,
      tuning.CLIMAX_PINBALL_SEGMENT_ROWS_END_MAX,
      varianceU32,
      4,
      32
    );
    if (climaxPhaseRowBudget != null && Number.isFinite(climaxPhaseRowBudget)) {
      const cap = Math.max(4, Math.floor(climaxPhaseRowBudget) - 4);
      v = Math.min(v, cap);
    }
    return v;
  }

  function pathSegmentClimaxFalseWallTotalRows(tuning, totalRows, varianceU32, climaxPhaseRowBudget, pinballSegmentRows) {
    const d = gapDifficulty01FromTotalRows(tuning, totalRows);
    let v = pathSegmentIntClamped(
      tuning,
      d,
      tuning.CLIMAX_FALSE_WALL_ROWS_START_MIN,
      tuning.CLIMAX_FALSE_WALL_ROWS_START_MAX,
      tuning.CLIMAX_FALSE_WALL_ROWS_END_MIN,
      tuning.CLIMAX_FALSE_WALL_ROWS_END_MAX,
      varianceU32,
      FALSE_WALL_MIN_PHASE_ROWS,
      28
    );
    if (climaxPhaseRowBudget != null && Number.isFinite(climaxPhaseRowBudget)) {
      const bud = Math.floor(climaxPhaseRowBudget);
      const minFw = FALSE_WALL_MIN_PHASE_ROWS;
      const maxByBudget =
        pinballSegmentRows != null && Number.isFinite(pinballSegmentRows)
          ? Math.max(minFw, bud - Math.max(0, Math.floor(pinballSegmentRows)))
          : Math.max(minFw, bud);
      v = Math.min(v, maxByBudget);
    }
    return Math.max(FALSE_WALL_MIN_PHASE_ROWS, v);
  }

  function pathSegmentFlowChuteRowsBeforeChicane(tuning, totalRows, varianceU32, flowPhaseRowBudget) {
    const d = gapDifficulty01FromTotalRows(tuning, totalRows);
    let v = pathSegmentIntClamped(
      tuning,
      d,
      tuning.FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MIN,
      tuning.FLOW_CHUTE_ROWS_BEFORE_CHICANE_START_MAX,
      tuning.FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MIN,
      tuning.FLOW_CHUTE_ROWS_BEFORE_CHICANE_END_MAX,
      varianceU32,
      8,
      48
    );
    if (flowPhaseRowBudget != null && Number.isFinite(flowPhaseRowBudget)) {
      const cap = Math.max(8, Math.floor(flowPhaseRowBudget) - 4);
      v = Math.min(v, cap);
    }
    return v;
  }

  function pathSegmentReleaseRestZoneRows(tuning, totalRows, varianceU32, releasePhaseRowBudget) {
    const d = gapDifficulty01FromTotalRows(tuning, totalRows);
    let v = pathSegmentIntClamped(
      tuning,
      d,
      tuning.RELEASE_REST_ZONE_ROWS_START_MIN,
      tuning.RELEASE_REST_ZONE_ROWS_START_MAX,
      tuning.RELEASE_REST_ZONE_ROWS_END_MIN,
      tuning.RELEASE_REST_ZONE_ROWS_END_MAX,
      varianceU32,
      3,
      30
    );
    if (releasePhaseRowBudget != null && Number.isFinite(releasePhaseRowBudget)) {
      const cap = Math.max(3, Math.floor(releasePhaseRowBudget) - 1);
      v = Math.min(v, cap);
    }
    return v;
  }

  function multipathGapWidthParamsFromTotalRows(tuning, totalRowsGenerated, rowLength, rowStreamSeed) {
    const d = gapDifficulty01FromTotalRows(tuning, totalRowsGenerated);
    const t = tuning;
    const minW = Math.max(
      1,
      intFromRampedRange(
        d,
        t.MULTIPATH_MIN_GAP_COLS_START_MIN,
        t.MULTIPATH_MIN_GAP_COLS_START_MAX,
        t.MULTIPATH_MIN_GAP_COLS_END_MIN,
        t.MULTIPATH_MIN_GAP_COLS_END_MAX,
        rowParamSubmix(rowStreamSeed, 1)
      )
    );
    const maxCap = Math.max(
      minW,
      intFromRampedRange(
        d,
        t.MULTIPATH_MAX_GAP_COLS_CAP_START_MIN,
        t.MULTIPATH_MAX_GAP_COLS_CAP_START_MAX,
        t.MULTIPATH_MAX_GAP_COLS_CAP_END_MIN,
        t.MULTIPATH_MAX_GAP_COLS_CAP_END_MAX,
        rowParamSubmix(rowStreamSeed, 2)
      )
    );
    const fracLo = lerpNum(t.ROW_LENGTH_WIDTH_FRAC_START_MIN, t.ROW_LENGTH_WIDTH_FRAC_END_MIN, d);
    const fracHi = lerpNum(t.ROW_LENGTH_WIDTH_FRAC_START_MAX, t.ROW_LENGTH_WIDTH_FRAC_END_MAX, d);
    const fa = Math.min(fracLo, fracHi);
    const fb = Math.max(fracLo, fracHi);
    const frac = fa + unitFloatFromU32(rowParamSubmix(rowStreamSeed, 3)) * (fb - fa);
    const maxW = Math.max(minW, Math.min(maxCap, Math.floor(rowLength * frac)));
    const initialWideThreshold =
      t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START +
      (t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_END - t.MULTIPATH_INITIAL_WIDE_WIDTH_THRESHOLD_START) * d;
    return { minW, maxW, initialWideThreshold };
  }

  function unionMinimalSeam(prevGaps, nextGaps, columnCount) {
    const nextSet = new Set(nextGaps);
    for (let i = 0; i < prevGaps.length; i++) {
      const g = prevGaps[i];
      if (g >= 0 && g < columnCount && nextSet.has(g)) return nextGaps;
    }
    if (prevGaps.length === 0) return nextGaps;
    const anchor = prevGaps[0];
    if (anchor >= 0 && anchor < columnCount && !nextSet.has(anchor)) {
      const merged = nextGaps.slice();
      merged.push(anchor);
      merged.sort((a, b) => a - b);
      return merged;
    }
    return nextGaps;
  }

  function groupGapsToRanges(gaps, columns) {
    if (!gaps || gaps.length === 0 || columns <= 0) return [];
    const sorted = gaps
      .map((g) => Math.round(g))
      .filter((g) => Number.isFinite(g))
      .map((g) => clampInt(g, 0, columns - 1))
      .sort((a, b) => a - b);
    if (sorted.length === 0) return [];
    const ranges = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const value = sorted[i];
      if (value === prev) continue;
      if (value === prev + 1) {
        prev = value;
        continue;
      }
      ranges.push({ startCol: start, endCol: prev });
      start = value;
      prev = value;
    }
    ranges.push({ startCol: start, endCol: prev });
    return ranges;
  }

  const rangeWidthCols = (r) => Math.max(1, r.endCol - r.startCol + 1);
  const rangeCenterCols = (r) => (r.startCol + r.endCol) * 0.5;

  function enforceRangeConstraints(ranges, rowLength) {
    if (rowLength <= 0) return [];
    let normalized = ranges
      .map((r) => {
        const a = clampInt(r.startCol, 0, rowLength - 1);
        const b = clampInt(r.endCol, 0, rowLength - 1);
        return a <= b ? { startCol: a, endCol: b } : { startCol: b, endCol: a };
      })
      .sort((x, y) => x.startCol - y.startCol);
    const merged = [];
    for (let i = 0; i < normalized.length; i++) {
      const r = normalized[i];
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push(r);
        continue;
      }
      if (r.startCol <= last.endCol + 1) last.endCol = Math.max(last.endCol, r.endCol);
      else merged.push(r);
    }
    for (let j = 0; j < merged.length; j++) {
      merged[j].startCol = clampInt(merged[j].startCol, 0, rowLength - 1);
      merged[j].endCol = clampInt(Math.max(merged[j].endCol, merged[j].startCol), 0, rowLength - 1);
    }
    return merged;
  }

  function splitRange(r, rowLength, minWidth) {
    const w = rangeWidthCols(r);
    if (w < minWidth * 2 + 1) return [r];
    const center = Math.round(rangeCenterCols(r));
    const leftEnd = clampInt(center - 1, r.startCol + minWidth - 1, r.endCol - (minWidth + 1));
    const rightStart = clampInt(leftEnd + 2, r.startCol + minWidth + 1, r.endCol - (minWidth - 1));
    const left = { startCol: r.startCol, endCol: leftEnd };
    const right = { startCol: rightStart, endCol: r.endCol };
    if (rangeWidthCols(left) < minWidth || rangeWidthCols(right) < minWidth) return [r];
    if (right.startCol <= left.endCol + 1) return [r];
    return enforceRangeConstraints([left, right], rowLength);
  }

  const overlapCols = (a, b) =>
    Math.max(0, Math.min(a.endCol, b.endCol) - Math.max(a.startCol, b.startCol) + 1);

  function ensureMinWidth(ranges, rowLength, minWidth) {
    if (!ranges || !ranges.length) return ranges || [];
    const expanded = ranges.map((r) => {
      const w = rangeWidthCols(r);
      if (w >= minWidth) return r;
      const start = clampInt(r.startCol, 0, rowLength - 1);
      const end = clampInt(Math.min(rowLength - 1, start + minWidth - 1), 0, rowLength - 1);
      return { startCol: start, endCol: end };
    });
    return enforceRangeConstraints(expanded, rowLength);
  }

  function ensureEachCurrOverlapsSomePrev(curr, prev, rowLength, minOverlapCols) {
    if (!curr || !curr.length || !prev || !prev.length) return curr || [];
    const fixed = curr.map((r) => ({ ...r }));
    for (let i = 0; i < fixed.length; i++) {
      const r = fixed[i];
      let bestPrev = prev[0];
      let bestDist = Number.POSITIVE_INFINITY;
      const c = rangeCenterCols(r);
      for (let j = 0; j < prev.length; j++) {
        const d = Math.abs(c - rangeCenterCols(prev[j]));
        if (d < bestDist) {
          bestDist = d;
          bestPrev = prev[j];
        }
      }
      const ov = overlapCols(r, bestPrev);
      if (ov >= minOverlapCols) continue;
      let shift = 0;
      if (r.endCol < bestPrev.startCol) shift = bestPrev.startCol + (minOverlapCols - 1) - r.endCol;
      else if (r.startCol > bestPrev.endCol) shift = bestPrev.endCol - (minOverlapCols - 1) - r.startCol;
      else shift = clampInt(Math.round(rangeCenterCols(bestPrev) - rangeCenterCols(r)), -1, 1);
      if (shift !== 0) {
        r.startCol = clampInt(r.startCol + shift, 0, rowLength - 1);
        r.endCol = clampInt(r.endCol + shift, 0, rowLength - 1);
        if (r.endCol < r.startCol) r.endCol = r.startCol;
      }
    }
    return enforceRangeConstraints(fixed, rowLength);
  }

  function rangesToGaps(ranges) {
    const gaps = [];
    for (let i = 0; i < (ranges || []).length; i++) {
      for (let c = ranges[i].startCol; c <= ranges[i].endCol; c++) gaps.push(c);
    }
    return gaps;
  }

  function maybeMutateRangesDeterministic(tuning, ranges, rowLength, pathRunId, rowIndex, phase, proceduralStreamSalt) {
    const tension = effectiveGapTension01(tuning, phase, proceduralStreamSalt);
    const mutated = ranges.map((r, idx) => {
      const uShift = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 300 + idx));
      const uDir = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 400 + idx));
      const uResize = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 500 + idx));
      const uWiden = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 600 + idx));
      const doShift = uShift < 0.42 + tension * 0.2;
      const doResize = uResize < 0.38 + tension * 0.15;
      const shift = uDir < 0.5 ? -1 : 1;
      const widen = uWiden < 0.5 ? -1 : 1;
      let start = r.startCol;
      let end = r.endCol;
      if (doShift) {
        start += shift;
        end += shift;
      }
      if (doResize) {
        if (widen < 0) {
          start -= 1;
          end += 1;
        } else if (rangeWidthCols(r) > 1) {
          start += 1;
          end -= 1;
        }
      }
      return { startCol: start, endCol: end };
    });
    return enforceRangeConstraints(mutated, rowLength);
  }

  function generateGapsDeterministic(tuning, prevGaps, rowLength, rowIndex, pathRunId, macroPhase, proceduralStreamSalt, totalRows) {
    const u = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 11));
    const depth = runDepthTensionBonus01(tuning, proceduralStreamSalt);
    const pivot =
      macroPhase === "climax"
        ? 0.32 - depth * 0.04
        : macroPhase === "tension"
          ? 0.42
          : macroPhase === "release"
            ? 0.58
            : 0.5 - depth * 0.05;
    const goLeftFirst = u < pivot + (macroPhase === "tension" ? 0.08 : macroPhase === "release" ? -0.06 : 0);
    if (prevGaps.length === 0) return [Math.floor(rowLength / 2)];
    const difficulty01 = gapDifficulty01FromTotalRows(tuning, totalRows);
    const includeAdjacent = difficulty01 < tuning.SINGLE_PATH_INCLUDE_ADJACENT_UNTIL_DIFFICULTY;
    const nextGaps = [];
    if (goLeftFirst) {
      const leftMostGap = Math.min(...prevGaps);
      if (includeAdjacent && leftMostGap > 0) nextGaps.push(leftMostGap - 1);
      nextGaps.push(leftMostGap);
      if (includeAdjacent && leftMostGap < rowLength - 1) nextGaps.push(leftMostGap + 1);
    } else {
      const rightMostGap = Math.max(...prevGaps);
      if (includeAdjacent && rightMostGap < rowLength - 1) nextGaps.push(rightMostGap + 1);
      nextGaps.push(rightMostGap);
      if (includeAdjacent && rightMostGap > 0) nextGaps.push(rightMostGap - 1);
    }
    return unionMinimalSeam(prevGaps, nextGaps, rowLength);
  }

  function generateMultiPathGapsDeterministic(
    tuning,
    prevGaps,
    rowLength,
    rowIndex,
    pathRunId,
    macroPhase,
    proceduralStreamSalt,
    totalRows
  ) {
    const MAX_PATHS = 4;
    const gapParamSeed = mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 705);
    const { minW: MIN_W, maxW: MAX_W, initialWideThreshold } = multipathGapWidthParamsFromTotalRows(
      tuning,
      totalRows,
      rowLength,
      gapParamSeed
    );
    const MIN_OVERLAP = 1;
    const tension = effectiveGapTension01(tuning, macroPhase, proceduralStreamSalt);
    let prevRanges = groupGapsToRanges(prevGaps, rowLength);
    if (prevRanges.length === 0) {
      const center = Math.floor(rowLength / 2);
      const uW = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 21));
      const width = uW < initialWideThreshold + tension * 0.2 ? 3 : 2;
      const startA = clampInt(center - Math.floor(width / 2), 0, rowLength - 1);
      const a = { startCol: startA, endCol: Math.min(rowLength - 1, startA + width - 1) };
      const u2 = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 22));
      const twoPaths = rowLength >= 8 && u2 < 0.26 + tension * 0.14;
      if (twoPaths) {
        const offset = Math.max(2, Math.floor(rowLength / 4));
        const uSide = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 23));
        const bCenter = clampInt(center + (uSide < 0.5 ? -offset : offset), 0, rowLength - 1);
        const bStart = clampInt(bCenter - 1, 0, rowLength - 1);
        const b = { startCol: bStart, endCol: Math.min(rowLength - 1, bStart + 1) };
        prevRanges = enforceRangeConstraints([a, b], rowLength);
      } else prevRanges = enforceRangeConstraints([a], rowLength);
    }
    let ranges = ensureMinWidth(prevRanges, rowLength, MIN_W);
    ranges = maybeMutateRangesDeterministic(tuning, ranges, rowLength, pathRunId, rowIndex, macroPhase, proceduralStreamSalt);
    ranges = ensureMinWidth(ranges, rowLength, MIN_W);
    ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);
    const uSplit = unitFloatFromU32(mixPathRowStreamSalt(pathRunId, rowIndex, proceduralStreamSalt, 24));
    const splitThreshold = 0.2 + tension * 0.24;
    if (ranges.length < MAX_PATHS && uSplit < splitThreshold) {
      let widestIdx = 0;
      let widest = 0;
      for (let i = 0; i < ranges.length; i++) {
        const w = rangeWidthCols(ranges[i]);
        if (w > widest) {
          widest = w;
          widestIdx = i;
        }
      }
      if (widest >= MIN_W * 2 + 1) {
        const children = splitRange(ranges[widestIdx], rowLength, MIN_W);
        if (children.length > 1) {
          const next = [...ranges.slice(0, widestIdx), ...children, ...ranges.slice(widestIdx + 1)];
          ranges = enforceRangeConstraints(next, rowLength);
          ranges = ensureMinWidth(ranges, rowLength, MIN_W);
          ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);
        }
      }
    }
    if (ranges.length > MAX_PATHS) {
      ranges = [...ranges]
        .sort((a, b) => rangeWidthCols(b) - rangeWidthCols(a))
        .slice(0, MAX_PATHS)
        .sort((a, b) => a.startCol - b.startCol);
    }
    ranges = ensureMinWidth(ranges, rowLength, MIN_W);
    ranges = ranges.map((r) => {
      const w = rangeWidthCols(r);
      if (w <= MAX_W) return r;
      const center = Math.round(rangeCenterCols(r));
      const half = Math.floor(MAX_W / 2);
      const start = clampInt(center - half, 0, rowLength - 1);
      const end = clampInt(start + MAX_W - 1, 0, rowLength - 1);
      return { startCol: start, endCol: end };
    });
    ranges = enforceRangeConstraints(ranges, rowLength);
    ranges = ensureMinWidth(ranges, rowLength, MIN_W);
    ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);
    const gaps = rangesToGaps(ranges);
    return unionMinimalSeam(prevGaps, gaps, rowLength);
  }

  function gapsFromRowBits(row) {
    const gaps = [];
    for (let c = 0; c < row.length; c++) if (row[c] === 0) gaps.push(c);
    return gaps;
  }

  function rowFromGaps(gaps, columnCount) {
    const row = new Array(columnCount).fill(1);
    for (let i = 0; i < gaps.length; i++) {
      const g = gaps[i];
      if (g >= 0 && g < columnCount) row[g] = 0;
    }
    return row;
  }

  function tensionFunnelWidthAtStep(stepIndex) {
    const raw = Math.max(0, Math.floor(stepIndex));
    return Math.max(1, TENSION_FUNNEL_START_WIDTH - Math.min(raw, TENSION_FUNNEL_START_WIDTH - 1));
  }

  function tensionFunnelInclusiveBounds(center, width) {
    const W = Math.max(1, Math.round(width));
    const c = Math.round(center);
    return { left: c - Math.floor(W / 2), right: c + Math.ceil(W / 2) - 1 };
  }

  function tensionFunnelRow(stepIndex, center, columnCount) {
    const W = tensionFunnelWidthAtStep(stepIndex);
    let { left, right } = tensionFunnelInclusiveBounds(center, W);
    left = Math.max(0, Math.min(columnCount - 1, left));
    right = Math.max(0, Math.min(columnCount - 1, right));
    if (right < left) {
      const t = left;
      left = right;
      right = t;
    }
    const gapList = [];
    for (let c = left; c <= right; c++) gapList.push(c);
    return rowFromGaps(gapList, columnCount);
  }

  function tensionGapCenterFromPrevGaps(gaps, columnCount) {
    if (!gaps || gaps.length === 0) return Math.floor(columnCount / 2);
    let mn = columnCount;
    let mx = -1;
    for (let i = 0; i < gaps.length; i++) {
      const g = gaps[i];
      if (g >= 0 && g < columnCount) {
        if (g < mn) mn = g;
        if (g > mx) mx = g;
      }
    }
    if (mx < 0) return Math.floor(columnCount / 2);
    return Math.round((mn + mx) / 2);
  }

  function tensionParadoxBaseGapColumns(priorCentralColumn, columnCount) {
    const C = Math.max(0, Math.min(columnCount - 1, Math.round(priorCentralColumn)));
    const leftHard = C - 3;
    const easyLeft = C + 2;
    const easyMid = C + 3;
    const easyRight = C + 4;
    const cols = [];
    if (leftHard >= 0 && leftHard < columnCount) cols.push(leftHard);
    if (easyLeft >= 0 && easyLeft < columnCount) cols.push(easyLeft);
    if (easyMid >= 0 && easyMid < columnCount) cols.push(easyMid);
    if (easyRight >= 0 && easyRight < columnCount) cols.push(easyRight);
    if (cols.length === 0) {
      const fallbacks = [leftHard, easyLeft, easyMid, easyRight, C];
      for (let i = 0; i < fallbacks.length; i++) {
        const c = fallbacks[i];
        if (c >= 0 && c < columnCount) {
          cols.push(c);
          break;
        }
      }
    }
    if (cols.length === 0) cols.push(Math.max(0, Math.min(columnCount - 1, C)));
    return cols.sort((a, b) => a - b);
  }

  function prevPassableSet(prevPassableColumns, columnCount) {
    const s = new Set();
    if (!prevPassableColumns || prevPassableColumns.length === 0) return s;
    for (let i = 0; i < prevPassableColumns.length; i++) {
      const g = Math.round(prevPassableColumns[i]);
      if (Number.isFinite(g) && g >= 0 && g < columnCount) s.add(g);
    }
    return s;
  }

  function paradoxGapsOverlapPrev(gaps, prev) {
    for (let i = 0; i < gaps.length; i++) if (prev.has(gaps[i])) return true;
    return false;
  }

  function nudgeParadoxGapsToTouchPrev(baseGapColumns, prevPassableColumns, columnCount) {
    const base = [...baseGapColumns].sort((a, b) => a - b);
    const prev = prevPassableSet(prevPassableColumns, columnCount);
    if (!prev.size || paradoxGapsOverlapPrev(base, prev)) return base;
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let s = -columnCount; s <= columnCount; s++) {
      const seen = new Set();
      const shifted = [];
      for (let i = 0; i < base.length; i++) {
        const g = base[i] + s;
        if (g >= 0 && g < columnCount && !seen.has(g)) {
          seen.add(g);
          shifted.push(g);
        }
      }
      shifted.sort((a, b) => a - b);
      if (!paradoxGapsOverlapPrev(shifted, prev)) continue;
      const score = Math.abs(s) * 1000 - shifted.length;
      if (score < bestScore) {
        bestScore = score;
        best = shifted;
      }
    }
    return best || base;
  }

  function tensionParadoxSplitRow(priorCentralColumn, columnCount, prevPassableColumns) {
    const base = tensionParadoxBaseGapColumns(priorCentralColumn, columnCount);
    const cols = nudgeParadoxGapsToTouchPrev(base, prevPassableColumns, columnCount);
    return rowFromGaps(cols, columnCount);
  }

  function releaseCatharticRestZoneGaps(columnCount) {
    const gaps = [];
    for (let c = 1; c <= columnCount - 2; c++) gaps.push(c);
    return gaps;
  }

  function flowGapCenterBounds(columnCount) {
    const lo = 1;
    const hi = Math.max(lo, columnCount - 2);
    return { lo, hi };
  }

  function clampGapCenter(center, columnCount) {
    const { lo, hi } = flowGapCenterBounds(columnCount);
    return Math.max(lo, Math.min(hi, Math.round(center)));
  }

  function rowFromGapCenter(center, columnCount) {
    const c = clampGapCenter(center, columnCount);
    return rowFromGaps([c - 1, c, c + 1], columnCount);
  }

  function flowChuteNextRow(lastRow, columnCount) {
    if (!lastRow || lastRow.length === 0) {
      const seed = Math.floor(columnCount / 2);
      return rowFromGapCenter(seed, columnCount);
    }
    return lastRow.slice();
  }

  function extractTripleGapCenter(row, columnCount) {
    const gaps = gapsFromRowBits(row);
    if (gaps.length < 3) return null;
    for (let i = 0; i <= gaps.length - 3; i++) {
      const a = gaps[i];
      const b = gaps[i + 1];
      const c = gaps[i + 2];
      if (b === a + 1 && c === b + 1) return b;
    }
    return gaps[Math.floor(gaps.length / 2)] ?? null;
  }

  function createChicaneStateFromEntryCenter(entryCenter, columnCount, initialDirection) {
    const dir = initialDirection === -1 ? -1 : 1;
    return {
      center: clampGapCenter(entryCenter, columnCount),
      rowsInBlock: 0,
      direction: dir,
    };
  }

  function flowChicaneNextRow(_lastRow, state, columnCount, blockRowCount) {
    const n = blockRowCount ?? 2;
    const { lo, hi } = flowGapCenterBounds(columnCount);
    let center = clampGapCenter(state.center, columnCount);
    let rowsInBlock = state.rowsInBlock;
    let direction = state.direction;
    const row = rowFromGapCenter(center, columnCount);
    rowsInBlock += 1;
    if (rowsInBlock >= n) {
      rowsInBlock = 0;
      let next = center + direction * 2;
      if (next < lo || next > hi) {
        direction = direction === 1 ? -1 : 1;
        next = center + direction * 2;
      }
      center = Math.max(lo, Math.min(hi, next));
    }
    return { row, state: { center, rowsInBlock, direction } };
  }

  function climaxClampTwoWideLeft(left, columnCount) {
    const maxL = Math.max(0, columnCount - 2);
    return Math.max(0, Math.min(maxL, Math.round(left)));
  }

  function intervalsOverlap(a0, a1, b0, b1) {
    return a0 <= b1 && b0 <= a1;
  }

  function climaxPinballRepairHopOverlap(rawLeft, prevLeft, columnCount) {
    const p0 = climaxClampTwoWideLeft(prevLeft, columnCount);
    const p1 = p0 + 1;
    let L = climaxClampTwoWideLeft(rawLeft, columnCount);
    if (intervalsOverlap(L, L + 1, p0, p1)) return L;
    for (let d = 1; d <= columnCount; d++) {
      for (const sgn of [-1, 1]) {
        const cand = climaxClampTwoWideLeft(rawLeft + sgn * d, columnCount);
        if (intervalsOverlap(cand, cand + 1, p0, p1)) return cand;
      }
    }
    return p0;
  }

  function gapRunsFromSorted(sortedUnique) {
    const runs = [];
    if (!sortedUnique.length) return runs;
    let lo = sortedUnique[0];
    let hi = sortedUnique[0];
    for (let i = 1; i < sortedUnique.length; i++) {
      const v = sortedUnique[i];
      if (v === hi + 1) hi = v;
      else {
        runs.push({ lo, hi });
        lo = v;
        hi = v;
      }
    }
    runs.push({ lo, hi });
    return runs;
  }

  function twoWideLeftInRun(pick, columnCount, slotSalt) {
    if (pick.hi >= pick.lo + 1) {
      const numPos = pick.hi - pick.lo;
      const slot = intMod(slotSalt >>> 0, Math.max(1, numPos));
      return climaxClampTwoWideLeft(pick.lo + slot, columnCount);
    }
    return climaxClampTwoWideLeft(pick.lo - 1, columnCount);
  }

  function climaxPinballInitialAnchor(prevGaps, columnCount, varietySalt) {
    if (varietySalt === undefined) varietySalt = 0x00100000;
    const maxL = Math.max(0, columnCount - 2);
    const mid = Math.floor(columnCount / 2) - 1;
    const jitter = intMod(mixU32(varietySalt >>> 0, columnCount >>> 0, 0x70696e31), 5) - 2;

    if (!prevGaps || prevGaps.length === 0) {
      const mode = intMod(varietySalt >>> 16, 4);
      if (mode === 3 && maxL >= 0) {
        return climaxClampTwoWideLeft(intMod(mixU32(varietySalt, 0x61, 0x6e), maxL + 1), columnCount);
      }
      return climaxClampTwoWideLeft(mid + jitter, columnCount);
    }
    const set = new Set();
    for (let i = 0; i < prevGaps.length; i++) {
      const g = prevGaps[i];
      if (g >= 0 && g < columnCount) set.add(Math.round(g));
    }
    const sorted = [...set].sort((a, b) => a - b);
    if (sorted.length === 0) return climaxClampTwoWideLeft(mid + jitter, columnCount);
    if (sorted.length === 1) {
      return climaxClampTwoWideLeft(sorted[0] - 1 + intMod(varietySalt >>> 8, 3) - 1, columnCount);
    }

    const runs = gapRunsFromSorted(sorted);
    const mean = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;

    let bestLen = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    const EPS = 1e-5;

    for (let r = 0; r < runs.length; r++) {
      const { lo: rlo, hi: rhi } = runs[r];
      const len = rhi - rlo + 1;
      const midR = (rlo + rhi) * 0.5;
      const dist = Math.abs(midR - mean);
      if (len > bestLen) {
        bestLen = len;
        bestDist = dist;
      } else if (len === bestLen && dist < bestDist - EPS) {
        bestDist = dist;
      }
    }

    const candIdx = [];
    for (let r = 0; r < runs.length; r++) {
      const { lo: rlo, hi: rhi } = runs[r];
      const len = rhi - rlo + 1;
      const midR = (rlo + rhi) * 0.5;
      const dist = Math.abs(midR - mean);
      if (len === bestLen && Math.abs(dist - bestDist) <= EPS) {
        candIdx.push(r);
      }
    }
    if (candIdx.length === 0) candIdx.push(0);
    const runPick = candIdx[intMod(varietySalt >>> 20, candIdx.length)];
    const pick = runs[runPick];
    const smartLeft = twoWideLeftInRun(pick, columnCount, varietySalt >>> 4);

    const mode = intMod(varietySalt >>> 24, 8);
    if (mode >= 6 && maxL >= 0) {
      return climaxClampTwoWideLeft(intMod(mixU32(varietySalt, 0x72, 0x64), maxL + 1), columnCount);
    }
    if (mode === 5) {
      const gPick = sorted[intMod(varietySalt >>> 12, sorted.length)];
      return climaxClampTwoWideLeft(gPick - 1 + intMod(varietySalt >>> 6, 3) - 1, columnCount);
    }
    return smartLeft;
  }

  function climaxPinballDriftDeltaFromSeed(patternSeed, driftStepIndex) {
    return intMod(mixU32(patternSeed >>> 0, driftStepIndex >>> 0, 0x64727431), 3) - 1;
  }

  function pinballHopMagFromSalt(salt) {
    const hopPick = intMod(mixU32(salt >>> 0, 0x70, 0x68), 14);
    const hopTable = [-9, -8, -7, -6, -5, 5, 6, 7, 8, 9, -10, -4, 4, 10];
    return hopTable[hopPick] ?? -6;
  }

  function createClimaxPinballRollState(prevGaps, columnCount, salt) {
    const driftCount = 2 + intMod(mixU32(salt >>> 0, 0x70, 0x6e), 5);
    const patternSeed = mixU32(salt >>> 0, 0x70, 0x62);
    const hopMag = pinballHopMagFromSalt(salt);
    const anchorSalt = mixU32(salt >>> 0, 0x70, 0x61);
    const anchorLeft = climaxPinballInitialAnchor(prevGaps, columnCount, anchorSalt);
    const w0 = climaxClampTwoWideLeft(anchorLeft, columnCount);
    return {
      stepMod: 0,
      anchorLeft: w0,
      wanderLeft: w0,
      driftCount,
      patternSeed,
      hopMag,
    };
  }

  function climaxPinballStep(state, columnCount) {
    const wanderIn =
      typeof state.wanderLeft === "number" && Number.isFinite(state.wanderLeft)
        ? state.wanderLeft
        : state.anchorLeft;
    const wander = climaxClampTwoWideLeft(wanderIn, columnCount);
    const rawDrift = Number(state.driftCount);
    const driftCount = Number.isFinite(rawDrift) ? Math.max(1, Math.min(8, Math.floor(rawDrift))) : 3;
    const patternSeed =
      typeof state.patternSeed === "number" && Number.isFinite(state.patternSeed) ? state.patternSeed : 27;
    const hopMag = typeof state.hopMag === "number" && Number.isFinite(state.hopMag) ? state.hopMag : -5;
    const anchor = climaxClampTwoWideLeft(state.anchorLeft, columnCount);
    const cycleLen = driftCount + 1;
    const sm = ((state.stepMod % cycleLen) + cycleLen) % cycleLen;

    let left;
    let nextWander;
    if (sm < driftCount) {
      if (sm === 0) {
        left = anchor;
        nextWander = left;
      } else {
        const d = climaxPinballDriftDeltaFromSeed(patternSeed, sm - 1);
        nextWander = climaxClampTwoWideLeft(wander + d, columnCount);
        left = nextWander;
      }
    } else {
      const prevLeft = wander;
      const rawHop = prevLeft + hopMag;
      left = climaxPinballRepairHopOverlap(rawHop, prevLeft, columnCount);
      nextWander = left;
    }
    const row = rowFromGaps([left, left + 1], columnCount);
    const nextMod = (sm + 1) % cycleLen;
    const nextAnchor = nextMod === 0 ? left : anchor;
    const nextW = nextMod === 0 ? left : nextWander;
    return {
      row,
      state: {
        stepMod: nextMod,
        anchorLeft: nextAnchor,
        wanderLeft: nextW,
        driftCount,
        patternSeed,
        hopMag,
      },
    };
  }

  function climaxFalseWallFullWidthGapRow(columnCount) {
    const gaps = [];
    for (let c = 0; c < columnCount; c++) gaps.push(c);
    return rowFromGaps(gaps, columnCount);
  }

  function climaxFalseWallCavernRow(columnCount) {
    const gaps = [];
    const lo = Math.max(0, Math.min(CLIMAX_FALSE_CAVERN_LO, columnCount - 1));
    const hi = Math.min(Math.max(lo, CLIMAX_FALSE_CAVERN_HI), columnCount - 1);
    for (let c = lo; c <= hi; c++) gaps.push(c);
    return rowFromGaps(gaps, columnCount);
  }

  function climaxFalseWallSqueezeColumn(columnCount, squeezeAtRight) {
    if (squeezeAtRight) {
      const target = Math.max(2, columnCount - 2);
      return Math.min(target, Math.max(0, columnCount - 1));
    }
    return Math.min(1, Math.max(0, columnCount - 1));
  }

  function climaxFalseWallSchedule(totalRows) {
    const minC = FALSE_WALL_MIN_CAVERN_ROWS;
    const R = Math.max(1, Math.floor(totalRows));
    if (R < minC + 1) {
      return { K: 1, cavernPerSeg: [Math.max(0, R - 1)] };
    }
    const denom = minC + 2;
    let K = Math.max(1, Math.floor((R + 1) / denom));
    while (K > 1 && R - 2 * K + 1 < K * minC) {
      K--;
    }
    const cavernTotal = R - 2 * K + 1;
    const extra = Math.max(0, cavernTotal - K * minC);
    const add = Math.floor(extra / K);
    const rem = extra % K;
    const cavernPerSeg = [];
    for (let i = 0; i < K; i++) {
      cavernPerSeg.push(minC + add + (i < rem ? 1 : 0));
    }
    return { K, cavernPerSeg };
  }

  function climaxFalseWallSegmentCount(totalRows) {
    return climaxFalseWallSchedule(totalRows).K;
  }

  function climaxFalseWallRow(subRow, columnCount, totalRows, layoutSalt) {
    const salt = layoutSalt === undefined ? 0 : layoutSalt >>> 0;
    const R = Math.max(1, Math.floor(totalRows));
    const sr = Math.max(0, Math.min(R - 1, Math.floor(subRow)));
    const { K, cavernPerSeg } = climaxFalseWallSchedule(R);
    const startRight = (mixU32(salt >>> 0, R >>> 0, 0x666c7740) & 1) === 1;
    let sub = 0;
    for (let seg = 0; seg < K; seg++) {
      const cavernN = cavernPerSeg[seg] ?? FALSE_WALL_MIN_CAVERN_ROWS;
      const squeezeAtRight = seg % 2 === 0 ? startRight : !startRight;
      for (let i = 0; i < cavernN; i++) {
        if (sub === sr) return climaxFalseWallCavernRow(columnCount);
        sub++;
      }
      if (sub === sr) {
        const col = climaxFalseWallSqueezeColumn(columnCount, squeezeAtRight);
        return rowFromGaps([col], columnCount);
      }
      sub++;
      if (seg < K - 1) {
        if (sub === sr) return climaxFalseWallFullWidthGapRow(columnCount);
        sub++;
      }
    }
    return climaxFalseWallCavernRow(columnCount);
  }

  function blocksFromGaps(columns, gaps) {
    const gapSet = new Set(gaps);
    const blocks = [];
    for (let c = 0; c < columns; c++) if (!gapSet.has(c)) blocks.push(c);
    return blocks;
  }

  function macroForSegment(segment) {
    if (
      segment === "funnel" ||
      segment === "paradoxSplit" ||
      segment === "tensionMultipath" ||
      segment === "tensionArc"
    )
      return "tension";
    if (segment === "pinball" || segment === "falseWall" || segment === "climaxMultipath") return "climax";
    if (segment === "releaseRestZone" || segment === "releaseMultipath" || segment === "releaseDefault")
      return "release";
    return "flow";
  }

  /**
   * cfg: { segment, columns, rowCount, pathRunId, streamStart, advanceStream, tuning, overrides }
   * overrides: optional { funnelRows, pinballRows, falseWallRows, restRows, chuteRows } numbers or null
   */
  function buildLevel(cfg) {
    const tuning = Object.assign(defaultGapTuning(), cfg.tuning || {});
    const segment = cfg.segment || "flowMultipath";
    const columns = clampInt(Number(cfg.columns) || 15, 5, 32);
    const rowCount = clampInt(Number(cfg.rowCount) || 40, 1, 400);
    const pathRunId = (Number(cfg.pathRunId) || 0) >>> 0;
    let stream = (Number(cfg.streamStart) || 0) >>> 0;
    const advanceStream = cfg.advanceStream !== false;
    const ov = cfg.overrides || {};
    const isDirectedMacro = segment === "directedMacro";
    const staticMacro = macroForSegment(segment);

    const rows = [];
    let prevGaps = [];
    const xctx = {};

    function mp(prev, rowIndex, macroPhase) {
      return generateMultiPathGapsDeterministic(tuning, prev, columns, rowIndex, pathRunId, macroPhase, stream, stream);
    }

    function finalize(g) {
      const sorted = [...new Set((g || []).map((x) => clampInt(x, 0, columns - 1)))].sort((a, b) => a - b);
      if (sorted.length === 0) return [Math.floor(columns / 2)];
      return sorted;
    }

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const macro = isDirectedMacro ? pacingMacroLowerAtTr(tuning, stream >>> 0) : staticMacro;
      if (isDirectedMacro) {
        const prevM = xctx._dmMacro;
        if (prevM !== macro) {
          for (const k of Object.keys(xctx)) {
            if (k !== "_dmMacro") delete xctx[k];
          }
          xctx._dmMacro = macro;
        }
      }
      const pacingSnap = getPacingCycleState(tuning, stream >>> 0);
      let gaps = [];
      let meta = {
        segment,
        macro,
        rowIndex,
        stream,
        pacing: {
          rowInCycle: pacingSnap.rowInCycle,
          cycleStart: pacingSnap.cycleStartTotalRows,
          cycleLen: pacingSnap.cycleTotalRows,
          flowRows: pacingSnap.flowRows,
          tensionRows: pacingSnap.tensionRows,
          climaxRows: pacingSnap.climaxRows,
          releaseRows: pacingSnap.releaseRows,
        },
      };

      if (segment === "flowMultipath") {
        gaps = finalize(mp(prevGaps, rowIndex, macro));
      } else if (segment === "flowChute") {
        if (!xctx.flowChuteRowsTarget) {
          xctx.flowChuteRowsTarget =
            ov.chuteRows != null && ov.chuteRows !== ""
              ? clampInt(Number(ov.chuteRows), 4, 80)
              : pathSegmentFlowChuteRowsBeforeChicane(
                  tuning,
                  stream,
                  mixU32(pathRunId, stream, 0x666c6f77),
                  pacingSnap.flowRows
                );
        }
        if (xctx.flowMode !== "chicane") {
          const lastSw =
            prevGaps.length > 0
              ? rowFromGaps(prevGaps, columns)
              : null;
          const chuteRow = flowChuteNextRow(lastSw, columns);
          gaps = gapsFromRowBits(chuteRow);
          xctx.flowChuteRowCount = (xctx.flowChuteRowCount || 0) + 1;
          if (xctx.flowChuteRowCount >= xctx.flowChuteRowsTarget) {
            xctx.flowMode = "chicane";
            const entry = extractTripleGapCenter(chuteRow, columns) ?? Math.floor(columns / 2);
            xctx.chicaneState = createChicaneStateFromEntryCenter(entry, columns, 1);
          }
        } else {
          const lastSw = rowFromGaps(prevGaps, columns);
          const st = xctx.chicaneState;
          const { row, state } = flowChicaneNextRow(lastSw, st, columns, CHICANE_BLOCK_N);
          xctx.chicaneState = state;
          gaps = gapsFromRowBits(row);
        }
        meta.flow = { mode: xctx.flowMode || "chute", chuteN: xctx.flowChuteRowCount, cap: xctx.flowChuteRowsTarget };
      } else if (isDirectedMacro && macro === "flow") {
        gaps = finalize(mp(prevGaps, rowIndex, macro));
      } else if (macro === "tension") {
        if (segment === "paradoxSplit") {
          if (!xctx.tensionCenterInit) {
            xctx.tensionCenter = tensionGapCenterFromPrevGaps(prevGaps, columns);
            xctx.tensionCenterInit = true;
          }
          const row = tensionParadoxSplitRow(xctx.tensionCenter, columns, prevGaps);
          gaps = gapsFromRowBits(row);
          meta.paradoxLoop = true;
        } else if (segment === "tensionMultipath") {
          if (!xctx.tensionStage) xctx.tensionStage = "free";
          gaps = finalize(mp(prevGaps, rowIndex, macro));
        } else {
          if (!xctx.tensionStage) {
            xctx.tensionStage = "funnel";
            xctx.tensionFunnelStep = 0;
            xctx.tensionFunnelDurationRows =
              ov.funnelRows != null && ov.funnelRows !== ""
                ? clampInt(Number(ov.funnelRows), TENSION_FUNNEL_MIN_DURATION, 40)
                : pathSegmentTensionFunnelDurationRows(
                    tuning,
                    stream,
                    mixU32(pathRunId, stream, 0x66756e31),
                    pacingSnap.tensionRows
                  );
            xctx.tensionCenter = tensionGapCenterFromPrevGaps(prevGaps, columns);
            xctx.tensionParadoxEmitted = 0;
          }
          if (xctx.tensionStage === "funnel") {
            const step = xctx.tensionFunnelStep || 0;
            const row = tensionFunnelRow(step, xctx.tensionCenter, columns);
            gaps = gapsFromRowBits(row);
            xctx.tensionFunnelStep = step + 1;
            const cap = xctx.tensionFunnelDurationRows || 6;
            if (xctx.tensionFunnelStep >= cap) {
              if (segment === "funnel") {
                xctx.tensionFunnelStep = 0;
                xctx.tensionFunnelDurationRows =
                  ov.funnelRows != null && ov.funnelRows !== ""
                    ? clampInt(Number(ov.funnelRows), TENSION_FUNNEL_MIN_DURATION, 40)
                    : pathSegmentTensionFunnelDurationRows(
                        tuning,
                        stream,
                        mixU32(pathRunId, stream, 0x66756e32),
                        pacingSnap.tensionRows
                      );
                meta.funnelLoop = true;
              } else {
                xctx.tensionStage = "paradox";
              }
            }
            meta.funnelStep = step;
          } else if (xctx.tensionStage === "paradox" && xctx.tensionParadoxEmitted < 1) {
            const row = tensionParadoxSplitRow(xctx.tensionCenter, columns, prevGaps);
            gaps = gapsFromRowBits(row);
            xctx.tensionParadoxEmitted = 1;
            xctx.tensionStage = "free";
          } else {
            gaps = finalize(mp(prevGaps, rowIndex, macro));
          }
        }
      } else if (macro === "climax") {
        if (segment === "climaxMultipath") {
          if (!xctx.climaxStage) xctx.climaxStage = "free";
          gaps = finalize(mp(prevGaps, rowIndex, macro));
        } else if (segment === "directedMacro") {
          if (!xctx.climaxStage) {
            xctx.climaxStage = "pinball";
            xctx.climaxPinballRows = 0;
            xctx.climaxPinballSegmentTargetRows = pathSegmentClimaxPinballSegmentRows(
              tuning,
              stream,
              mixU32(pathRunId, stream, 0x706e6231),
              pacingSnap.climaxRows
            );
            xctx.climaxPinballState = createClimaxPinballRollState(
              prevGaps,
              columns,
              mixU32(pathRunId >>> 0, stream >>> 0, 0x706e6230)
            );
          }
          const pinCapDm = xctx.climaxPinballSegmentTargetRows || 8;
          if (xctx.climaxStage === "pinball" && (xctx.climaxPinballRows || 0) >= pinCapDm) {
            xctx.climaxStage = "falseWall";
            xctx.climaxFalseSubRow = 0;
            xctx.climaxFalseWallTotalRows = pathSegmentClimaxFalseWallTotalRows(
              tuning,
              stream,
              mixU32(pathRunId, stream, 0x666c7733),
              pacingSnap.climaxRows,
              pinCapDm
            );
          }
          if (xctx.climaxStage === "falseWall") {
            const subDm = xctx.climaxFalseSubRow || 0;
            const fwTotalDm = xctx.climaxFalseWallTotalRows || 4;
            const falseWallSaltDm = mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7741);
            const rowDm = climaxFalseWallRow(subDm, columns, fwTotalDm, falseWallSaltDm);
            gaps = gapsFromRowBits(rowDm);
            xctx.climaxFalseSubRow = subDm + 1;
            if (xctx.climaxFalseSubRow >= fwTotalDm) {
              xctx.climaxStage = "free";
            }
            meta.falseWallSub = subDm;
          } else if (xctx.climaxStage === "pinball") {
            const rowsDoneDm = xctx.climaxPinballRows || 0;
            const st = xctx.climaxPinballState;
            const { row, state } = climaxPinballStep(st, columns);
            xctx.climaxPinballState = state;
            xctx.climaxPinballRows = rowsDoneDm + 1;
            gaps = gapsFromRowBits(row);
            meta.pinballRow = rowsDoneDm;
          } else if (xctx.climaxStage === "free") {
            gaps = finalize(mp(prevGaps, rowIndex, macro));
          }
        } else if (segment === "pinball") {
          if (!xctx.climaxStage) {
            xctx.climaxStage = "pinball";
            xctx.climaxPinballRows = 0;
            xctx.climaxPinballSegmentTargetRows =
              ov.pinballRows != null && ov.pinballRows !== ""
                ? clampInt(Number(ov.pinballRows), 4, 48)
                : pathSegmentClimaxPinballSegmentRows(
                    tuning,
                    stream,
                    mixU32(pathRunId, stream, 0x706e6231),
                    pacingSnap.climaxRows
                  );
            xctx.climaxPinballState = createClimaxPinballRollState(
              prevGaps,
              columns,
              mixU32(pathRunId >>> 0, stream >>> 0, 0x706e6230)
            );
          }
          const pinCap = xctx.climaxPinballSegmentTargetRows || 8;
          const rowsDone = xctx.climaxPinballRows || 0;
          if (rowsDone < pinCap) {
            const st = xctx.climaxPinballState;
            const { row, state } = climaxPinballStep(st, columns);
            xctx.climaxPinballState = state;
            xctx.climaxPinballRows = rowsDone + 1;
            gaps = gapsFromRowBits(row);
            meta.pinballRow = rowsDone;
          } else {
            gaps = finalize(mp(prevGaps, rowIndex, macro));
          }
        } else {
          if (!xctx.climaxStage) {
            xctx.climaxStage = "falseWall";
            xctx.climaxFalseSubRow = 0;
            xctx.climaxFalseWallTotalRows =
              ov.falseWallRows != null && ov.falseWallRows !== ""
                ? clampInt(Number(ov.falseWallRows), 4, 32)
                : pathSegmentClimaxFalseWallTotalRows(
                    tuning,
                    stream,
                    mixU32(pathRunId, stream, 0x666c7731),
                    pacingSnap.climaxRows
                  );
          }
          if (xctx.climaxStage === "falseWall") {
            const sub = xctx.climaxFalseSubRow || 0;
            const fwTotal = xctx.climaxFalseWallTotalRows || 4;
            const falseWallSalt = mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7741);
            const row = climaxFalseWallRow(sub, columns, fwTotal, falseWallSalt);
            gaps = gapsFromRowBits(row);
            xctx.climaxFalseSubRow = sub + 1;
            if (xctx.climaxFalseSubRow >= fwTotal) {
              xctx.climaxStage = "free";
            }
            meta.falseWallSub = sub;
          } else {
            gaps = finalize(mp(prevGaps, rowIndex, macro));
          }
        }
      } else if (macro === "release") {
        if (segment === "releaseRestZone") {
          gaps = finalize(releaseCatharticRestZoneGaps(columns));
        } else if (segment === "releaseMultipath") {
          gaps = finalize(mp(prevGaps, rowIndex, macro));
        } else if (segment === "directedMacro") {
          const emittedDm = xctx.releaseRestZoneRowsEmitted || 0;
          if (xctx.releaseRestZoneTargetRows == null) {
            xctx.releaseRestZoneTargetRows = pathSegmentReleaseRestZoneRows(
              tuning,
              stream,
              mixU32(pathRunId, stream, 0x72656c31),
              pacingSnap.releaseRows
            );
          }
          const capDm = xctx.releaseRestZoneTargetRows || 10;
          if (emittedDm < capDm) {
            gaps = finalize(releaseCatharticRestZoneGaps(columns));
            xctx.releaseRestZoneRowsEmitted = emittedDm + 1;
          } else {
            gaps = finalize(mp(prevGaps, rowIndex, macro));
          }
        } else if (segment === "releaseDefault") {
          const emitted = xctx.releaseRestZoneRowsEmitted || 0;
          if (xctx.releaseRestZoneTargetRows == null) {
            xctx.releaseRestZoneTargetRows =
              ov.restRows != null && ov.restRows !== ""
                ? clampInt(Number(ov.restRows), 2, 40)
                : pathSegmentReleaseRestZoneRows(
                    tuning,
                    stream,
                    mixU32(pathRunId, stream, 0x72656c31),
                    pacingSnap.releaseRows
                  );
          }
          const cap = xctx.releaseRestZoneTargetRows || 10;
          if (emitted < cap) {
            gaps = finalize(releaseCatharticRestZoneGaps(columns));
            xctx.releaseRestZoneRowsEmitted = emitted + 1;
          } else {
            gaps = finalize(mp(prevGaps, rowIndex, macro));
          }
        } else {
          gaps = finalize(mp(prevGaps, rowIndex, macro));
        }
      }

      prevGaps = gaps.slice();
      rows.push({
        gaps,
        blocks: blocksFromGaps(columns, gaps),
        __pathLab: meta,
      });
      if (advanceStream) stream = (stream + 1) >>> 0;
    }

    return { columns, rows, meta: { segment, pathRunId, streamStart: cfg.streamStart, advanceStream } };
  }

  global.PathLab = {
    defaultGapTuning,
    buildLevel,
    getPacingCycleState: (tuning, tr) => getPacingCycleState(tuning, tr >>> 0),
    pacingCycleLayoutFromCycleStart: (tuning, cycleStart) =>
      pacingCycleLayoutFromCycleStart(tuning, Math.floor(Math.max(0, cycleStart))),
    gapShiftRunwayDupRowsPreview(tuning, totalRows, varianceU32) {
      const d = gapDifficulty01FromTotalRows(tuning, totalRows);
      const t = tuning;
      return Math.max(
        0,
        intFromRampedRange(
          d,
          t.RUNWAY_DUP_ROWS_START_MIN,
          t.RUNWAY_DUP_ROWS_START_MAX,
          t.RUNWAY_DUP_ROWS_END_MIN,
          t.RUNWAY_DUP_ROWS_END_MAX,
          varianceU32
        )
      );
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
