/**
 * Procedural hazard generators — mirror future stageHazardGenerators.ts.
 */
(function (global) {
  "use strict";

  const S = () => global.StageDesignSchema;

  let hzCounter = 1;
  let trkCounter = 1;
  let mkCounter = 1;

  function nextHzId() {
    return `hz-${hzCounter++}-${Date.now().toString(36)}`;
  }
  function nextTrkId() {
    return `trk-${trkCounter++}-${Date.now().toString(36)}`;
  }
  function nextMkId() {
    return `mk-${mkCounter++}-${Date.now().toString(36)}`;
  }

  function scalePreset(columns, preset) {
    if (preset === "6of8") return Math.max(2, Math.round((6 / 8) * columns));
    if (preset === "2of8") return Math.max(1, Math.round((2 / 8) * columns));
    return Math.max(1, Math.floor(columns / 3));
  }

  function gapColsFromWidth(columns, gapWidth, centerCol) {
    const w = Math.max(1, Math.round(gapWidth));
    const center = centerCol != null ? centerCol : (columns - 1) / 2;
    let start = Math.round(center - (w - 1) / 2);
    start = Math.max(0, Math.min(start, columns - w));
    const gaps = [];
    for (let c = start; c < start + w && c < columns; c++) gaps.push(c);
    return gaps;
  }

  function blocksFromGaps(columns, gaps) {
    const set = new Set(gaps);
    const blocks = [];
    for (let c = 0; c < columns; c++) if (!set.has(c)) blocks.push(c);
    return blocks;
  }

  function attachBounds(hazard, columns, startRow, endRow, colStart, colEnd) {
    hazard.bounds = {
      rowStart: startRow,
      rowEnd: endRow != null ? endRow : startRow,
      colStart: colStart != null ? colStart : 0,
      colEnd: colEnd != null ? colEnd : columns - 1,
    };
    return hazard;
  }

  function viseSequence(params, columns, startGlobalRow) {
    const rows = Math.max(3, Math.min(6, params.rows ?? 5));
    const startW = params.startGapCols ?? Math.max(2, columns - 2);
    const endW = params.endGapCols ?? Math.max(1, 2);
    const drift = params.driftCols ?? 0;
    const rowDefs = [];
    for (let i = 0; i < rows; i++) {
      const t = rows <= 1 ? 1 : i / (rows - 1);
      const gapW = startW + (endW - startW) * t;
      const center = (columns - 1) / 2 + drift * t;
      const gaps = gapColsFromWidth(columns, gapW, center);
      rowDefs.push({ blocks: blocksFromGaps(columns, gaps), gaps, macroPhase: params.macroPhase || "tension" });
    }
    const hzId = nextHzId();
    const hazard = attachBounds(
      {
        id: hzId,
        kind: "hazard_vise",
        renderLayer: "machinery",
        anchor: { globalRowIndex: startGlobalRow },
        params: { rows, rowSpan: rows, startGapCols: startW, endGapCols: endW, driftCols: drift },
        phases: [],
      },
      columns,
      startGlobalRow,
      startGlobalRow + rows - 1
    );
    const markers = [];
    if (params.addTelegraph !== false) {
      markers.push({
        id: nextMkId(),
        globalRowIndex: Math.max(0, startGlobalRow - 1),
        kind: "hazard_flash",
        label: "Squeeze!",
      });
    }
    return {
      rows: rowDefs,
      hazards: [hazard],
      tracks: [],
      markers,
      binding: {
        fn: "viseSequence",
        params: { rows, startGapCols: startW, endGapCols: endW, driftCols: drift },
        hazardIds: [hzId],
      },
    };
  }

  function irisClampRow(params, columns, globalRow) {
    const preset = params.preset || "2of8";
    const closedW = params.closedGapCols ?? scalePreset(columns, preset);
    const openW = params.openGapCols ?? Math.max(closedW + 1, columns - 2);
    const closeDur = params.closeDurationSec ?? 0.9;
    const telegraphRows = params.telegraphRows ?? 2;
    const gaps = gapColsFromWidth(columns, openW);
    const hzId = nextHzId();
    const hazard = attachBounds(
      {
        id: hzId,
        kind: "hazard_iris_clamp",
        renderLayer: "machinery",
        anchor: { globalRowIndex: globalRow, side: "both" },
        params: {
          openGapCols: openW,
          closedGapCols: closedW,
          closeDurationSec: closeDur,
          telegraphRows,
          preset,
        },
        phases: [
          { name: "open", durationSec: 0.2 },
          { name: "closing", durationSec: closeDur },
          { name: "closed", durationSec: 0.3 },
        ],
      },
      columns,
      globalRow,
      globalRow
    );
    const markers = [];
    for (let t = 1; t <= telegraphRows; t++) {
      markers.push({
        id: nextMkId(),
        globalRowIndex: Math.max(0, globalRow - t),
        kind: "telegraph",
        label: t === telegraphRows ? "Clamp!" : "",
      });
    }
    return {
      rows: [{ blocks: blocksFromGaps(columns, gaps), gaps }],
      hazards: [hazard],
      tracks: [],
      markers,
      binding: { fn: "irisClampRow", params: { preset, closeDurationSec: closeDur, telegraphRows }, hazardIds: [hzId] },
    };
  }

  function tiltGate(params, columns, globalRow) {
    const side = params.side || "left";
    const twin = Boolean(params.twin);
    const gapCols = params.gapCols ?? Math.max(1, columns - 2);
    const closeDur = params.closeDurationSec ?? 0.7;
    const gaps = gapColsFromWidth(columns, gapCols, side === "left" ? gapCols / 2 : columns - gapCols / 2 - 1);
    const hzId = nextHzId();
    const hazard = attachBounds(
      {
        id: hzId,
        kind: "hazard_tilt_gate",
        renderLayer: "machinery",
        anchor: { globalRowIndex: globalRow },
        params: { side, twin, gapCols, closeDurationSec: closeDur, twinOffsetSec: params.twinOffsetSec ?? 0.3 },
        phases: [
          { name: "open", durationSec: 0.15 },
          { name: "closing", durationSec: closeDur },
          { name: "closed", durationSec: 0.25 },
        ],
      },
      columns,
      globalRow,
      globalRow,
      side === "left" ? 0 : Math.floor(columns / 2),
      side === "left" ? Math.floor(columns / 2) : columns - 1
    );
    return {
      rows: [{ blocks: blocksFromGaps(columns, gaps), gaps }],
      hazards: [hazard],
      tracks: [],
      markers: [{ id: nextMkId(), globalRowIndex: globalRow, kind: "hazard_flash", label: "Drop!" }],
      binding: { fn: "tiltGate", params: { side, twin, closeDurationSec: closeDur }, hazardIds: [hzId] },
    };
  }

  function buzzWheel(params, columns, globalRow) {
    const mode = params.mode || "fixed";
    const col = params.column ?? Math.floor(columns / 2);
    const spinRpm = params.spinRpm ?? 120;
    const trkId = mode === "drift" ? nextTrkId() : null;
    const tracks = [];
    if (trkId) {
      tracks.push({
        id: trkId,
        label: "buzz drift",
        axis: "column",
        mode: "pingpong",
        keyframes: [
          { tSec: 0, column: params.startCol ?? 1 },
          { tSec: params.driftDurationSec ?? 2.5, column: params.endCol ?? columns - 2 },
        ],
      });
    }
    const hzId = nextHzId();
    const c = Math.round(col);
    const hazard = attachBounds(
      {
        id: hzId,
        kind: "hazard_buzz_wheel",
        renderLayer: "machinery",
        anchor: { globalRowIndex: globalRow },
        trackId: trkId,
        params: { column: col, mode, spinRpm, radiusFrac: 0.35, startCol: params.startCol, endCol: params.endCol },
        phases: [],
      },
      columns,
      globalRow,
      globalRow,
      c,
      c
    );
    return {
      rows: [{ blocks: blocksFromGaps(columns, gapColsFromWidth(columns, 2, col)), gaps: gapColsFromWidth(columns, 2, col) }],
      hazards: [hazard],
      tracks,
      markers: [{ id: nextMkId(), globalRowIndex: globalRow, kind: "hazard_flash", label: "Buzz!" }],
      binding: { fn: "buzzWheel", params: { mode, spinRpm }, hazardIds: [hzId], trackIds: trkId ? [trkId] : [] },
    };
  }

  function slidingGap(params, columns, startGlobalRow) {
    const span = params.rowSpan ?? 4;
    const startCol = params.startGapCenter ?? 1;
    const endCol = params.endGapCenter ?? columns - 2;
    const gapCols = params.gapCols ?? 2;
    const rowDefs = [];
    for (let i = 0; i < span; i++) {
      const t = span <= 1 ? 1 : i / (span - 1);
      const center = startCol + (endCol - startCol) * t;
      const gaps = gapColsFromWidth(columns, gapCols, center);
      rowDefs.push({ blocks: blocksFromGaps(columns, gaps), gaps });
    }
    const hzId = nextHzId();
    return {
      rows: rowDefs,
      hazards: [
        attachBounds(
          {
            id: hzId,
            kind: "pattern_sliding_gap",
            renderLayer: "machinery",
            anchor: { globalRowIndex: startGlobalRow },
            params: { rowSpan: span, startGapCenter: startCol, endGapCenter: endCol, gapCols },
            phases: [],
          },
          columns,
          startGlobalRow,
          startGlobalRow + span - 1
        ),
      ],
      tracks: [],
      markers: [],
      binding: { fn: "slidingGap", params: { rowSpan: span, startGapCenter: startCol, endGapCenter: endCol }, hazardIds: [hzId] },
    };
  }

  function run(fnName, params, columns, startGlobalRow) {
    switch (fnName) {
      case "viseSequence":
        return viseSequence(params || {}, columns, startGlobalRow);
      case "irisClampRow":
        return irisClampRow(params || {}, columns, startGlobalRow);
      case "tiltGate":
        return tiltGate(params || {}, columns, startGlobalRow);
      case "buzzWheel":
        return buzzWheel(params || {}, columns, startGlobalRow);
      case "slidingGap":
        return slidingGap(params || {}, columns, startGlobalRow);
      default:
        throw new Error(`Unknown generator: ${fnName}`);
    }
  }

  function rerollBinding(binding, columns, startGlobalRow, seedBump) {
    const params = { ...(binding.params || {}), seed: (binding.params?.seed || 0) + (seedBump || 1) };
    if (binding.fn === "viseSequence" && params.driftCols === 0) {
      params.driftCols = (seedBump || 1) % 2 === 0 ? 0 : 1;
    }
    return run(binding.fn, params, columns, startGlobalRow);
  }

  global.StageDesignHazardGenerators = {
    run,
    rerollBinding,
    viseSequence,
    irisClampRow,
    tiltGate,
    buzzWheel,
    slidingGap,
    scalePreset,
    nextHzId,
    nextTrkId,
    nextMkId,
  };
})(typeof window !== "undefined" ? window : globalThis);
