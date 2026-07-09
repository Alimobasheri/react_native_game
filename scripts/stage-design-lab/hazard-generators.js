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

  const MIN_RESIDUAL_GAP_COLS_DEFAULT = 1;

  function scalePreset(columns, preset) {
    if (preset === "widePreset" || preset === "6of8") {
      return Math.max(2, Math.round((6 / 8) * columns));
    }
    if (preset === "narrowPreset" || preset === "2of8") {
      return Math.max(1, Math.round((2 / 8) * columns));
    }
    return Math.max(1, Math.floor(columns / 3));
  }

  function maxPressColsForCorridor(gapWidthAtRest, oppositeWallInset, minResidualGapCols) {
    const minRes = minResidualGapCols ?? MIN_RESIDUAL_GAP_COLS_DEFAULT;
    const inset = Math.max(0, oppositeWallInset ?? 0);
    const gapW = Math.max(1, Math.round(gapWidthAtRest ?? 1));
    return Math.max(0, gapW - inset - minRes);
  }

  function capPressCols(gapWidthAtRest, requestedPressCols, oppositeWallInset, minResidualGapCols) {
    const maxP = maxPressColsForCorridor(gapWidthAtRest, oppositeWallInset, minResidualGapCols);
    return Math.max(0, Math.min(Math.max(0, Math.round(requestedPressCols ?? 0)), maxP));
  }

  function harmonizePlatformSlab(slabParams, corridorSpec, opts) {
    const minRes = opts?.minResidualGapCols ?? MIN_RESIDUAL_GAP_COLS_DEFAULT;
    const corridor = corridorSpec || { gapWidthCols: 2, oppositeWallInset: 0 };
    const p = slabParams || {};
    const requested = p.pressCols ?? 1;
    const capped = capPressCols(
      corridor.gapWidthCols,
      requested,
      corridor.oppositeWallInset ?? 0,
      minRes
    );
    const warnings = [];
    if (capped < requested) {
      warnings.push(
        `Capped pressCols ${requested} → ${capped} (gap ${corridor.gapWidthCols}, min residual ${minRes} col).`
      );
    }
    p.pressCols = capped;
    return { params: p, warnings, capped: capped < requested };
  }

  function tryFairnessForBeat(beat, columns, waterSpeedPxPerSec) {
    const schema = global.StageDesignSchema;
    const fair = global.StageDesignFairness;
    if (!schema?.flattenDocument || !fair?.computeFairnessReport) {
      return { ok: true, warnings: [], issues: [] };
    }
    const primarySpeed = waterSpeedPxPerSec ?? 350;
    const speeds = primarySpeed === 120 ? [120] : [primarySpeed, 120];
    let lastReport = { ok: true, warnings: [], issues: [] };
    for (const speed of speeds) {
      const doc = schema.flattenDocument({
        schemaVersion: 2,
        kind: "stage-design",
        grid: { columns, rowHeightPx: 24, cellGapPx: 3 },
        stage: { waterSpeedPxPerSec: speed },
        playback: { waterSpeedPxPerSec: speed, rowHeightPx: 24 },
        segments: [
          {
            id: "temp-seg",
            label: "temp",
            macroPhase: "flow",
            source: "procedural",
            rows: beat.rows,
          },
        ],
        hazards: beat.hazards || [],
        tracks: beat.tracks || [],
        markers: beat.markers || [],
      });
      lastReport = fair.computeFairnessReport(doc);
      if (!lastReport.ok) {
        return {
          ok: false,
          warnings: lastReport.warnings || [],
          issues: lastReport.issues || [],
          speed,
        };
      }
    }
    return { ok: true, warnings: lastReport.warnings || [], issues: [] };
  }

  function harmonizePlatformBeat(beat, opts) {
    const columns = opts?.columns ?? 6;
    const minRes = opts?.minResidualGapCols ?? MIN_RESIDUAL_GAP_COLS_DEFAULT;
    const corridor = opts?.corridor || { gapWidthCols: 2, oppositeWallInset: 0 };
    const warnings = [];

    for (const hz of beat.hazards || []) {
      if (hz.kind !== "hazard_platform") continue;
      const { warnings: w } = harmonizePlatformSlab(hz.params, corridor, { minResidualGapCols: minRes });
      warnings.push(...w);
    }

    let attempts = 0;
    while (attempts < 3) {
      const fair = tryFairnessForBeat(beat, columns, opts?.waterSpeedPxPerSec);
      if (fair.ok) break;
      const platformHazards = (beat.hazards || []).filter((h) => h.kind === "hazard_platform");
      if (!platformHazards.length) break;
      const timedIssue = (fair.issues || []).find((i) => i.type === "timed");
      const failRow = timedIssue?.row;
      const culprit =
        platformHazards.find(
          (h) =>
            failRow != null &&
            (h.bounds?.rowStart ?? 0) <= failRow &&
            (h.bounds?.rowEnd ?? 0) >= failRow
        ) ||
        platformHazards.find(
          (h) =>
            failRow != null &&
            (h.params?.animStartRow ?? h.bounds?.rowStart ?? 0) <= failRow &&
            (h.bounds?.rowEnd ?? 0) >= failRow - 1
        ) ||
        platformHazards[platformHazards.length - 1];
      if (attempts < 2) {
        culprit.params.pressDurationSec = (culprit.params.pressDurationSec ?? 1) + 0.3;
        warnings.push(
          `Fairness retry @${fair.speed ?? "?"}px/s row ${failRow ?? "?"}: ${culprit.id} pressDurationSec +0.3s (now ${culprit.params.pressDurationSec.toFixed(1)}s)`
        );
      } else {
        const anchor = culprit.bounds?.rowStart ?? culprit.anchor?.globalRowIndex ?? 0;
        culprit.params.animStartRow = Math.max(0, (culprit.params.animStartRow ?? anchor) - 1);
        warnings.push(`Fairness retry: ${culprit.id} telegraph lead +1 row`);
      }
      attempts++;
    }

    beat.harmonizerWarnings = warnings;
    return { beat, warnings, capped: warnings.some((w) => w.startsWith("Capped")) };
  }

  function buildPlatformSlabHazard(params, columns, startGlobalRow, slabStartRow, rowSpan, side) {
    const pressDur = params.pressDurationSec ?? 1.4;
    const pressCols = params.pressCols ?? 1;
    const pressEase = params.pressEase || "ease-out";
    const anchorCol = side === "left" ? 1 : columns - 2;
    const pressDirection = side === "left" ? "right" : "left";
    const rowEnd = slabStartRow + rowSpan - 1;
    const animStartRow = params.animStartRow ?? Math.max(0, slabStartRow - 2);
    const hzId = nextHzId();
    const hazard = attachBounds(
      {
        id: hzId,
        kind: "hazard_platform",
        renderLayer: "machinery",
        anchor: { globalRowIndex: slabStartRow },
        params: {
          pressCols,
          pressDurationSec: pressDur,
          pressDirection,
          pressEase,
          animStartRow,
          animStartSec: null,
        },
        phases: [
          { name: "pressing", durationSec: pressDur },
          { name: "held", durationSec: params.heldDurationSec ?? 0.25 },
        ],
      },
      columns,
      slabStartRow,
      rowEnd,
      anchorCol,
      anchorCol
    );
    return hazard;
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

  /** Machinery column — static orange wall removed on slab rows so the press can travel. */
  function pressWallCol(columns, side) {
    return side === "left" ? 1 : columns - 2;
  }

  function corridorRowForSlab(columns, gapWidth, centerCol, side) {
    const gaps = gapColsFromWidth(columns, gapWidth, centerCol);
    const wallCol = pressWallCol(columns, side);
    const gapSet = new Set(gaps);
    gapSet.add(wallCol);
    if (side === "left") {
      const gapMin = Math.min(...gaps);
      for (let c = wallCol + 1; c < gapMin; c++) gapSet.add(c);
    } else {
      const gapMax = Math.max(...gaps);
      for (let c = gapMax + 1; c < wallCol; c++) gapSet.add(c);
    }
    const newGaps = Array.from(gapSet).sort((a, b) => a - b);
    return { gaps: newGaps, blocks: blocksFromGaps(columns, newGaps) };
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

  function lerpNum(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  function lerpTeachEscalation(difficulty01) {
    const d = Math.max(0, Math.min(1, difficulty01 ?? 0.2));
    return {
      safeRunwayRows: Math.round(lerpNum(8, 6, d)),
      breatheRows: Math.round(lerpNum(5, 3, d)),
      chicaneRows: Math.round(lerpNum(4, 3, d)),
      releaseRows: Math.round(lerpNum(10, 5, d)),
      press1RowSpan: 3,
      press2RowSpan: Math.round(lerpNum(2, 2, d)),
      press1Duration: lerpNum(1.5, 1.15, d),
      press1Telegraph: Math.round(lerpNum(3, 2, d)),
      press2Duration: lerpNum(1.2, 0.95, d),
      press2Telegraph: Math.round(lerpNum(2, 1, d)),
      stackDuration: lerpNum(1.0, 0.8, d),
      climaxDuration: lerpNum(0.85, 0.75, d),
      climaxTelegraph: 1,
    };
  }

  function appendCorridorRows(rowDefs, columns, count, spec) {
    const gapW = spec.gapWidthCols ?? 2;
    const center = spec.centerCol ?? 2.5;
    const driftTotal = spec.driftTotalCols ?? 0;
    const n = Math.max(0, Math.round(count));
    for (let i = 0; i < n; i++) {
      const t = n <= 1 ? 0 : i / (n - 1);
      const gaps = gapColsFromWidth(columns, gapW, center + driftTotal * t);
      rowDefs.push({
        blocks: blocksFromGaps(columns, gaps),
        gaps,
        macroPhase: spec.macroPhase || "flow",
      });
    }
    return n;
  }

  function appendSlabEvent(ctx, localStartRow, spec) {
    const { rowDefs, hazards, markers, columns, warnings, opts, startGlobalRow } = ctx;
    const rowSpan = Math.max(1, spec.rowSpan ?? 1);
    const gapW = spec.gapWidthCols ?? 2;
    const centerCol = spec.centerCol ?? 2.5;
    const corridor = { gapWidthCols: gapW, oppositeWallInset: spec.oppositeWallInset ?? 0 };
    const side = spec.side ?? "right";
    const telegraphLead = spec.telegraphLeadRows ?? 2;
    const globalBase = startGlobalRow ?? 0;
    const slabStartGlobal = globalBase + localStartRow;

    for (let i = 0; i < rowSpan; i++) {
      const rowGeom = corridorRowForSlab(columns, gapW, centerCol, side);
      rowDefs.push({
        blocks: rowGeom.blocks,
        gaps: rowGeom.gaps,
        macroPhase: spec.macroPhase || "flow",
      });
    }

    const animStartGlobal =
      spec.animStartLocalRow != null
        ? globalBase + spec.animStartLocalRow
        : spec.animStartRow != null
          ? spec.animStartRow
          : Math.max(0, slabStartGlobal - telegraphLead);

    const slabParams = {
      pressCols: spec.pressCols ?? 1,
      pressDurationSec: spec.pressDurationSec ?? 1.2,
      pressEase: spec.pressEase ?? "ease-out",
      animStartRow: animStartGlobal,
      heldDurationSec: spec.heldDurationSec ?? 0.25,
    };
    const harm = harmonizePlatformSlab(slabParams, corridor, opts);
    if (harm.warnings.length) warnings.push(...harm.warnings);

    const hazard = buildPlatformSlabHazard(
      harm.params,
      columns,
      slabStartGlobal,
      slabStartGlobal,
      rowSpan,
      side
    );
    hazards.push(hazard);

    if (spec.addTelegraph !== false && telegraphLead > 0) {
      markers.push({
        id: nextMkId(),
        globalRowIndex: Math.max(0, hazard.params.animStartRow),
        kind: "telegraph",
        label: spec.telegraphLabel || "",
      });
    }

    return rowSpan;
  }

  function composePressIntroShaft(params, columns, startGlobalRow) {
    const seed = params?.seed ?? 0;
    const difficulty01 = Math.max(0, Math.min(1, params?.difficulty01 ?? 0.2));
    const esc = lerpTeachEscalation(difficulty01);
    const gapW = params?.gapWidthCols ?? 2;
    const baseCenter = 2.5;
    const chicaneSign = seed % 2 === 0 ? 1 : -1;
    const stackSide = seed % 2 === 1 ? "right" : "left";
    const climaxSide = stackSide === "right" ? "left" : "right";

    const rowDefs = [];
    const hazards = [];
    const markers = [];
    const warnings = [];
    let localCursor = 0;
    const ctx = {
      rowDefs,
      hazards,
      markers,
      columns,
      warnings,
      startGlobalRow,
      opts: {
        minResidualGapCols: params?.minResidualGapCols ?? MIN_RESIDUAL_GAP_COLS_DEFAULT,
      },
    };

    localCursor += appendCorridorRows(rowDefs, columns, esc.safeRunwayRows, {
      gapWidthCols: gapW,
      centerCol: baseCenter,
      macroPhase: "flow",
    });

    localCursor += appendSlabEvent(ctx, localCursor, {
      side: "right",
      rowSpan: esc.press1RowSpan,
      pressCols: 1,
      pressDurationSec: esc.press1Duration,
      pressEase: "ease-out",
      telegraphLeadRows: esc.press1Telegraph,
      gapWidthCols: gapW,
      centerCol: baseCenter,
      macroPhase: "flow",
    });

    localCursor += appendCorridorRows(rowDefs, columns, esc.breatheRows, {
      gapWidthCols: gapW,
      centerCol: baseCenter,
      macroPhase: "flow",
    });

    localCursor += appendSlabEvent(ctx, localCursor, {
      side: "left",
      rowSpan: esc.press2RowSpan,
      pressCols: 1,
      pressDurationSec: esc.press2Duration,
      pressEase: "ease-out",
      telegraphLeadRows: esc.press2Telegraph,
      gapWidthCols: gapW,
      centerCol: baseCenter,
      macroPhase: "flow",
    });

    const chicaneCenter = baseCenter + chicaneSign * 0.5;
    localCursor += appendCorridorRows(rowDefs, columns, esc.chicaneRows, {
      gapWidthCols: gapW,
      centerCol: chicaneCenter,
      driftTotalCols: chicaneSign * 0.5,
      macroPhase: "tension",
    });

    const stackLocal0 = localCursor;
    localCursor += appendSlabEvent(ctx, stackLocal0, {
      side: stackSide,
      rowSpan: 1,
      pressCols: 1,
      pressDurationSec: esc.stackDuration,
      pressEase: "ease-out",
      telegraphLeadRows: 1,
      gapWidthCols: gapW,
      centerCol: chicaneCenter,
      macroPhase: "tension",
      animStartLocalRow: stackLocal0 - 1,
    });

    const stackLocal1 = localCursor;
    localCursor += appendSlabEvent(ctx, stackLocal1, {
      side: stackSide,
      rowSpan: 1,
      pressCols: 1,
      pressDurationSec: esc.stackDuration,
      pressEase: "ease-out",
      telegraphLeadRows: 0,
      gapWidthCols: gapW,
      centerCol: chicaneCenter,
      macroPhase: "tension",
      animStartLocalRow: stackLocal1,
      addTelegraph: false,
    });

    localCursor += appendCorridorRows(rowDefs, columns, 2, {
      gapWidthCols: gapW,
      centerCol: chicaneCenter,
      driftTotalCols: baseCenter - chicaneCenter,
      macroPhase: "tension",
    });

    localCursor += appendSlabEvent(ctx, localCursor, {
      side: climaxSide,
      rowSpan: 1,
      pressCols: 1,
      pressDurationSec: esc.climaxDuration,
      pressEase: "ease-in",
      telegraphLeadRows: esc.climaxTelegraph,
      gapWidthCols: gapW,
      centerCol: baseCenter,
      macroPhase: "climax",
    });

    appendCorridorRows(rowDefs, columns, esc.releaseRows, {
      gapWidthCols: gapW,
      centerCol: baseCenter,
      macroPhase: "release",
    });

    const beat = { rows: rowDefs, hazards, tracks: [], markers };
    const harmonized = harmonizePlatformBeat(beat, {
      columns,
      corridor: { gapWidthCols: gapW, oppositeWallInset: 0 },
      waterSpeedPxPerSec: params?.waterSpeedPxPerSec,
      minResidualGapCols: MIN_RESIDUAL_GAP_COLS_DEFAULT,
    }).beat;

    const allWarnings = [...warnings, ...(harmonized.harmonizerWarnings || [])];

    return {
      rows: harmonized.rows,
      hazards: harmonized.hazards,
      tracks: [],
      markers: harmonized.markers,
      harmonizerWarnings: allWarnings,
      binding: {
        fn: "composePressIntroShaft",
        params: {
          seed,
          difficulty01,
          gapWidthCols: gapW,
          chicaneSign,
          stackSide,
        },
        hazardIds: harmonized.hazards.map((h) => h.id),
      },
    };
  }

  function pressTeachSingle(params, columns, startGlobalRow) {
    const seed = params?.seed ?? 0;
    const side = params?.side ?? (seed % 2 === 1 ? "right" : "left");
    const approachRows = params?.approachRows ?? 5;
    const slabRows = params?.rowSpan ?? 3;
    const recoveryRows = params?.recoveryRows ?? 4;
    const gapWidthCols = params?.gapWidthCols ?? 2;
    const centerCol = side === "right" ? 2.5 : 2.5;
    const corridor = { gapWidthCols, oppositeWallInset: params?.oppositeWallInset ?? 0 };

    const rowDefs = [];
    for (let i = 0; i < approachRows; i++) {
      const gaps = gapColsFromWidth(columns, gapWidthCols, centerCol);
      rowDefs.push({
        blocks: blocksFromGaps(columns, gaps),
        gaps,
        macroPhase: params.macroPhase || "flow",
      });
    }

    const slabStartRow = startGlobalRow + approachRows;
    for (let i = 0; i < slabRows; i++) {
      const rowGeom = corridorRowForSlab(columns, gapWidthCols, centerCol, side);
      rowDefs.push({
        blocks: rowGeom.blocks,
        gaps: rowGeom.gaps,
        macroPhase: params.macroPhase || "flow",
      });
    }

    for (let i = 0; i < recoveryRows; i++) {
      const t = recoveryRows <= 1 ? 0 : i / (recoveryRows - 1);
      const drift = (params.recoveryDriftCols ?? 0) * t;
      const gaps = gapColsFromWidth(columns, gapWidthCols, centerCol + drift);
      rowDefs.push({
        blocks: blocksFromGaps(columns, gaps),
        gaps,
        macroPhase: "release",
      });
    }

    const hazard = buildPlatformSlabHazard(
      {
        pressCols: params.pressCols ?? 1,
        pressDurationSec: params.pressDurationSec ?? 1.4,
        pressEase: params.pressEase ?? "ease-out",
        animStartRow: params.animStartRow ?? slabStartRow - 2,
        heldDurationSec: params.heldDurationSec ?? 0.25,
      },
      columns,
      startGlobalRow,
      slabStartRow,
      slabRows,
      side
    );

    const beat = {
      rows: rowDefs,
      hazards: [hazard],
      tracks: [],
      markers: [
        {
          id: nextMkId(),
          globalRowIndex: Math.max(0, slabStartRow - 2),
          kind: "telegraph",
          label: "",
        },
      ],
    };

    const harmonized = harmonizePlatformBeat(beat, {
      columns,
      corridor,
      waterSpeedPxPerSec: params.waterSpeedPxPerSec,
      minResidualGapCols: params.minResidualGapCols ?? MIN_RESIDUAL_GAP_COLS_DEFAULT,
    }).beat;

    const hzId = harmonized.hazards[0].id;
    return {
      rows: harmonized.rows,
      hazards: harmonized.hazards,
      tracks: [],
      markers: harmonized.markers,
      harmonizerWarnings: harmonized.harmonizerWarnings || [],
      binding: {
        fn: "pressTeachSingle",
        params: {
          side,
          approachRows,
          rowSpan: slabRows,
          recoveryRows,
          gapWidthCols,
          seed,
          difficulty01: params.difficulty01 ?? 0.2,
        },
        hazardIds: [hzId],
      },
    };
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
    const preset = params.preset || "narrowPreset";
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

  function corridorGapsForShaftRow(columns, gapWidth, centerCol, side) {
    const wallCol = pressWallCol(columns, side);
    let span = gapColsFromWidth(columns, gapWidth, centerCol);
    if (side === "right") span = span.filter((c) => c <= wallCol);
    else span = span.filter((c) => c >= wallCol);
    const gapSet = new Set(span);
    gapSet.add(wallCol);
    // Fill machinery pocket from trimmed span extremum BEFORE wallCol is in the set.
    if (span.length > 0) {
      if (side === "left") {
        const spanMin = Math.min(...span);
        for (let c = wallCol + 1; c < spanMin; c++) gapSet.add(c);
      } else {
        const spanMax = Math.max(...span);
        for (let c = spanMax + 1; c < wallCol; c++) gapSet.add(c);
      }
    }
    // Outer cave walls never stay playable gaps.
    const gaps = Array.from(gapSet)
      .filter((c) => c > 0 && c < columns - 1)
      .sort((a, b) => a - b);
    return { gaps, blocks: blocksFromGaps(columns, gaps) };
  }

  function survivorGapsHugFarWall(corridorGaps, narrowWidth, side) {
    const w = Math.max(1, Math.round(narrowWidth));
    const sorted = corridorGaps.slice().sort((a, b) => a - b);
    if (!sorted.length) return [];
    if (side === "right") return sorted.slice(0, Math.min(w, sorted.length));
    return sorted.slice(Math.max(0, sorted.length - w));
  }

  function maxOneSidedPressCols(corridorGaps, survivorGaps, side, columns) {
    if (!corridorGaps.length || !survivorGaps.length) return 0;
    const wallCol = pressWallCol(columns, side);
    const survivorCol =
      side === "right" ? Math.min(...survivorGaps) : Math.max(...survivorGaps);
    if (side === "right") return Math.max(0, wallCol - survivorCol - 1);
    return Math.max(0, survivorCol - wallCol - 1);
  }

  function composePathChicane(params, columns, startGlobalRow) {
    const seed = params?.seed ?? 0;
    const d = Math.max(0, Math.min(1, params?.difficulty01 ?? 0.2));
    const rowCount = params?.rowCount ?? 40;
    const previewOnly = params?.previewOnly === true;
    const wideW = Math.round(lerpNum(4, 3, d));
    const narrowW = 1;
    const shaftStart = 8;
    const blockN = 9;
    let center = Math.max(1, Math.min(columns - 2, Math.floor(columns / 2)));
    let direction = seed % 2 === 0 ? 1 : -1;
    let rowsInBlock = 0;
    const lo = 1;
    const hi = Math.max(lo, columns - 2);
    const rowDefs = [];
    const hazards = [];
    const warnings = [];
    const hazardIds = [];

    for (let i = 0; i < rowCount; i++) {
      const globalRow = startGlobalRow + i;
      const prevCenter = center;
      const gaps = gapColsFromWidth(columns, wideW, center);
      rowDefs.push({
        blocks: blocksFromGaps(columns, gaps),
        gaps,
        macroPhase: params?.macroPhase || "flow",
      });
      rowsInBlock += 1;
      if (rowsInBlock >= blockN) {
        rowsInBlock = 0;
        let next = center + direction * 2;
        if (next < lo || next > hi) {
          direction = direction === 1 ? -1 : 1;
          next = center + direction * 2;
        }
        center = Math.max(lo, Math.min(hi, next));
      }
      if (!previewOnly && i >= shaftStart && wideW > narrowW) {
        const wideGaps = gapColsFromWidth(columns, wideW, center);
        const narrowGaps = gapColsFromWidth(columns, narrowW, center);
        const narrowMid = (Math.min(...narrowGaps) + Math.max(...narrowGaps)) / 2;
        const wideMid = (Math.min(...wideGaps) + Math.max(...wideGaps)) / 2;
        const side = narrowMid >= wideMid ? "left" : "right";
        const corridor = corridorGapsForShaftRow(columns, wideW, center, side);
        rowDefs[rowDefs.length - 1] = {
          blocks: corridor.blocks,
          gaps: corridor.gaps,
          macroPhase: params?.macroPhase || "flow",
        };
        const survivorGaps = survivorGapsHugFarWall(corridor.gaps, narrowW, side);
        const geomMax = maxOneSidedPressCols(corridor.gaps, survivorGaps, side, columns);
        const requested = Math.min(
          Math.max(1, corridor.gaps.length - survivorGaps.length),
          geomMax
        );
        if (requested > 0) {
          const harm = harmonizePlatformSlab({ pressCols: requested }, { gapWidthCols: corridor.gaps.length }, {});
          warnings.push(...harm.warnings);
          const hzId = nextHzId();
          hazardIds.push(hzId);
          const anchorCol = side === "left" ? 1 : columns - 2;
          hazards.push(
            attachBounds(
              {
                id: hzId,
                kind: "hazard_platform",
                side,
                params: {
                  ...harm.params,
                  pressDirection: side === "left" ? "right" : "left",
                  pressDurationSec: 1.0,
                  pressEase: "ease-out",
                  animStartRow: Math.max(0, globalRow - 2),
                  heldDurationSec: 0.25,
                },
              },
              columns,
              globalRow,
              globalRow,
              anchorCol,
              anchorCol
            )
          );
        }
      }
    }

    return {
      rows: rowDefs,
      hazards,
      tracks: [],
      markers: [],
      harmonizerWarnings: warnings,
      binding: {
        fn: "composePathChicane",
        params: { seed, difficulty01: d, previewOnly, rowCount },
        hazardIds,
      },
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
      case "pressTeachSingle":
        return pressTeachSingle(params || {}, columns, startGlobalRow);
      case "composePressIntroShaft":
        return composePressIntroShaft(params || {}, columns, startGlobalRow);
      case "composePathChicane":
        return composePathChicane(params || {}, columns, startGlobalRow);
      default:
        throw new Error(`Unknown generator: ${fnName}`);
    }
  }

  function rerollBinding(binding, columns, startGlobalRow, seedBump) {
    const params = { ...(binding.params || {}), seed: (binding.params?.seed || 0) + (seedBump || 1) };
    if (binding.fn === "viseSequence" && params.driftCols === 0) {
      params.driftCols = (seedBump || 1) % 2 === 0 ? 0 : 1;
    }
    if (binding.fn === "pressTeachSingle") {
      params.side = params.seed % 2 === 1 ? "right" : "left";
    }
    if (binding.fn === "composePressIntroShaft") {
      params.chicaneSign = params.seed % 2 === 0 ? 1 : -1;
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
    pressTeachSingle,
    composePressIntroShaft,
    composePathChicane,
    lerpTeachEscalation,
    appendCorridorRows,
    appendSlabEvent,
    corridorRowForSlab,
    pressWallCol,
    scalePreset,
    maxPressColsForCorridor,
    capPressCols,
    harmonizePlatformSlab,
    harmonizePlatformBeat,
    MIN_RESIDUAL_GAP_COLS_DEFAULT,
    nextHzId,
    nextTrkId,
    nextMkId,
  };
})(typeof window !== "undefined" ? window : globalThis);
