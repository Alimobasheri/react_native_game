/**
 * StageDesignDocument v2 — schema, hazards, validation, flatten segments → render rows.
 */
(function (global) {
  "use strict";

  const SCHEMA_VERSION = 2;
  const LIVE_GAME_COLUMNS = 6;
  const DEFAULT_ROW_HEIGHT_PX = 24;
  const DEFAULT_CELL_GAP_PX = 3;
  const DEFAULT_WATER_SPEED = 350;

  const MACRO_PHASES = ["flow", "tension", "climax", "release"];

  const SIGNATURE_HAZARD_IDS = [
    { id: "none", label: "None (static gaps)" },
    { id: "hazard_platform", label: "Steel platform (single slab)" },
    { id: "hazard_vise", label: "Vise / Pinch Pipe (legacy)" },
    { id: "hazard_iris_clamp", label: "Iris clamp / Drawbridge Den" },
    { id: "hazard_tilt_gate", label: "Tilt gate" },
    { id: "hazard_buzz_wheel", label: "Buzz wheel" },
    { id: "hazard_piston", label: "Vertical piston (Crush Tube)" },
    { id: "setpiece_paddle", label: "Pinball paddle set-piece" },
  ];

  const STAGE_PRESETS = [
    { index: 1, displayName: "Flood Shaft", signatureHazardId: "none" },
    { index: 2, displayName: "Pinch Pipe", signatureHazardId: "hazard_vise" },
    { index: 3, displayName: "Drawbridge Den", signatureHazardId: "hazard_iris_clamp" },
    { index: 4, displayName: "Buzz Cavern", signatureHazardId: "hazard_buzz_wheel" },
    { index: 5, displayName: "Pinball Vault", signatureHazardId: "setpiece_paddle" },
    { index: 6, displayName: "Crush Tube", signatureHazardId: "hazard_piston" },
  ];

  const PHASE_COLORS = {
    flow: "rgba(45, 212, 191, 0.55)",
    tension: "rgba(251, 191, 36, 0.55)",
    climax: "rgba(248, 113, 113, 0.55)",
    release: "rgba(74, 222, 128, 0.55)",
  };

  const HAZARD_KINDS = [
    { id: "hazard_platform", label: "Steel platform (single slab)" },
    { id: "hazard_vise", label: "Vise / pinch jaws (legacy wizard)" },
    { id: "hazard_iris_clamp", label: "Iris clamp" },
    { id: "hazard_tilt_gate", label: "Tilt gate" },
    { id: "hazard_buzz_wheel", label: "Buzz wheel" },
    { id: "hazard_piston", label: "Vertical piston" },
    { id: "pattern_sliding_gap", label: "Sliding gap" },
  ];

  const MARKER_KINDS = [
    { id: "telegraph", label: "Telegraph" },
    { id: "hazard_flash", label: "Hazard flash" },
    { id: "tap_saved", label: "TAP / SAVED!" },
    { id: "near_miss", label: "Near Miss" },
    { id: "rest_preview", label: "REST preview" },
    { id: "praise", label: "Praise" },
  ];

  let segmentIdCounter = 1;
  let hazardIdCounter = 1;
  let trackIdCounter = 1;
  let markerIdCounter = 1;

  function nextHazardId() {
    return `hz-${hazardIdCounter++}-${Date.now().toString(36)}`;
  }
  function nextTrackId() {
    return `trk-${trackIdCounter++}-${Date.now().toString(36)}`;
  }
  function nextMarkerId() {
    return `mk-${markerIdCounter++}-${Date.now().toString(36)}`;
  }

  function migrateDocument(doc) {
    if (!doc || typeof doc !== "object") return doc;
    doc.schemaVersion = SCHEMA_VERSION;
    doc.kind = "stage-design";
    doc.hazards = Array.isArray(doc.hazards) ? doc.hazards : [];
    doc.tracks = Array.isArray(doc.tracks) ? doc.tracks : [];
    doc.markers = Array.isArray(doc.markers) ? doc.markers : [];
    doc.proceduralBindings = Array.isArray(doc.proceduralBindings) ? doc.proceduralBindings : [];
    if (Array.isArray(doc.motion) && !doc.tracks.length) {
      /* legacy motion[] ignored in v2 */
    }
    delete doc.motion;
    const cols = doc.grid?.columns ?? LIVE_GAME_COLUMNS;
    let totalRows = doc.flattened?.totalRows;
    if (totalRows == null && Array.isArray(doc.segments)) {
      totalRows = doc.segments.reduce((n, s) => n + (s.rows?.length || 0), 0);
    }
    totalRows = Math.max(1, totalRows || 1);
    doc.hazards.forEach((h) => normalizeHazardBounds(h, cols, totalRows));
    return doc;
  }

  function normalizeHazardBounds(hazard, columns, totalRows) {
    if (!hazard || typeof hazard !== "object") return hazard;
    const maxRow = Math.max(0, totalRows - 1);
    const maxCol = Math.max(0, columns - 1);
    if (hazard.bounds && typeof hazard.bounds === "object") {
      let rs = clampInt(hazard.bounds.rowStart, 0, maxRow);
      let re = clampInt(hazard.bounds.rowEnd, 0, maxRow);
      let cs = clampInt(hazard.bounds.colStart, 0, maxCol);
      let ce = clampInt(hazard.bounds.colEnd, 0, maxCol);
      if (rs > re) [rs, re] = [re, rs];
      if (cs > ce) [cs, ce] = [ce, cs];
      hazard.bounds = { rowStart: rs, rowEnd: re, colStart: cs, colEnd: ce };
    } else {
      const anchor = clampInt(hazard.anchor?.globalRowIndex ?? 0, 0, maxRow);
      const span = Math.max(1, hazard.params?.rowSpan ?? hazard.params?.rows ?? 1);
      hazard.bounds = {
        rowStart: anchor,
        rowEnd: clampInt(anchor + span - 1, 0, maxRow),
        colStart: 0,
        colEnd: maxCol,
      };
    }
    hazard.anchor = hazard.anchor || {};
    hazard.anchor.globalRowIndex = hazard.bounds.rowStart;
    hazard.params = hazard.params || {};
    const rowSpan = hazard.bounds.rowEnd - hazard.bounds.rowStart + 1;
    if (hazard.kind === "hazard_vise" || hazard.kind === "pattern_sliding_gap") {
      hazard.params.rowSpan = rowSpan;
      hazard.params.rows = rowSpan;
    }
    if (hazard.kind === "hazard_piston") {
      // Single-column hazard: bounds carry the column; keep params in sync on import.
      hazard.bounds.colEnd = hazard.bounds.colStart;
      hazard.params.column = hazard.bounds.colStart;
      if (hazard.params.mount !== "ceiling") hazard.params.mount = "floor";
    }
    return hazard;
  }

  function getHazardBounds(hazard) {
    return hazard?.bounds
      ? { ...hazard.bounds }
      : { rowStart: 0, rowEnd: 0, colStart: 0, colEnd: 0 };
  }

  function clampInt(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
  }

  function normalizeUniqueInts(values, min, max) {
    const clamped = (Array.isArray(values) ? values : [])
      .map((v) => Math.round(Number(v)))
      .filter((v) => Number.isFinite(v))
      .map((v) => Math.max(min, Math.min(max, v)));
    return Array.from(new Set(clamped)).sort((a, b) => a - b);
  }

  function computeGapsFromBlocks(columns, blocks) {
    const set = new Set(blocks);
    const gaps = [];
    for (let c = 0; c < columns; c++) if (!set.has(c)) gaps.push(c);
    return gaps;
  }

  function normalizeRow(row, columns) {
    const maxCol = Math.max(0, columns - 1);
    const blocks = normalizeUniqueInts(row?.blocks ?? [], 0, maxCol);
    const gaps = row?.gaps
      ? normalizeUniqueInts(row.gaps, 0, maxCol)
      : computeGapsFromBlocks(columns, blocks);
    return { blocks, gaps };
  }

  function emptyRow(columns, gapCenter) {
    const c = clampInt(gapCenter ?? Math.floor(columns / 2), 0, columns - 1);
    const blocks = [];
    for (let i = 0; i < columns; i++) if (i !== c) blocks.push(i);
    return { blocks, gaps: [c] };
  }

  function nextSegmentId() {
    return `seg-${segmentIdCounter++}-${Date.now().toString(36)}`;
  }

  function createSegment(args) {
    const columns = args.columns;
    const rowCount = Math.max(1, args.rowCount ?? 4);
    const macroPhase = MACRO_PHASES.includes(args.macroPhase) ? args.macroPhase : "flow";
    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      rows.push(normalizeRow(emptyRow(columns), columns));
    }
    return {
      id: args.id || nextSegmentId(),
      label: args.label || "New segment",
      macroPhase,
      source: args.source || "manual",
      pathLab: args.pathLab || null,
      rows,
    };
  }

  function createEmptyDocument(overrides) {
    const columns = clampInt(overrides?.columns ?? LIVE_GAME_COLUMNS, 4, 16);
    const preset = STAGE_PRESETS[0];
    const doc = {
      schemaVersion: SCHEMA_VERSION,
      kind: "stage-design",
      grid: {
        columns,
        rowHeightPx: DEFAULT_ROW_HEIGHT_PX,
        cellGapPx: DEFAULT_CELL_GAP_PX,
      },
      stage: {
        index: preset.index,
        displayName: preset.displayName,
        signatureHazardId: preset.signatureHazardId,
        waterSpeedPxPerSec: DEFAULT_WATER_SPEED,
      },
      segments: [
        createSegment({
          columns,
          label: "FLOW teach",
          macroPhase: "flow",
          rowCount: 8,
          source: "manual",
        }),
      ],
      playback: {
        waterSpeedPxPerSec: DEFAULT_WATER_SPEED,
        rowHeightPx: DEFAULT_ROW_HEIGHT_PX,
      },
      meta: {
        tool: "stage-design-lab",
        notes: "",
      },
      hazards: [],
      tracks: [],
      markers: [],
      proceduralBindings: [],
    };
    return flattenDocument(doc);
  }

  function flattenDocument(doc) {
    const columns = clampInt(doc?.grid?.columns ?? LIVE_GAME_COLUMNS, 4, 16);
    doc.grid = doc.grid || {};
    doc.grid.columns = columns;
    doc.grid.rowHeightPx = clampInt(doc.grid.rowHeightPx ?? DEFAULT_ROW_HEIGHT_PX, 8, 96);
    doc.grid.cellGapPx = clampInt(doc.grid.cellGapPx ?? DEFAULT_CELL_GAP_PX, 0, 12);

    doc.stage = doc.stage || {};
    doc.playback = doc.playback || {};
    doc.playback.waterSpeedPxPerSec =
      Number(doc.playback.waterSpeedPxPerSec) ||
      Number(doc.stage.waterSpeedPxPerSec) ||
      DEFAULT_WATER_SPEED;
    doc.playback.rowHeightPx = doc.grid.rowHeightPx;

    const segments = Array.isArray(doc.segments) ? doc.segments : [];
    const flatRows = [];
    let globalIndex = 0;

    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      if (!seg.id) seg.id = nextSegmentId();
      seg.macroPhase = MACRO_PHASES.includes(seg.macroPhase) ? seg.macroPhase : "flow";
      seg.rows = Array.isArray(seg.rows) ? seg.rows : [];
      for (let li = 0; li < seg.rows.length; li++) {
        const raw = seg.rows[li];
        const norm = normalizeRow(raw, columns);
        if (raw.macroPhase && MACRO_PHASES.includes(raw.macroPhase)) norm.macroPhase = raw.macroPhase;
        seg.rows[li] = norm;
        flatRows.push({
          globalRowIndex: globalIndex,
          segmentId: seg.id,
          localRowIndex: li,
          macroPhase: norm.macroPhase || seg.macroPhase,
          blocks: norm.blocks.slice(),
          gaps: norm.gaps.slice(),
        });
        globalIndex += 1;
      }
    }

    doc.flattened = {
      totalRows: flatRows.length,
      rows: flatRows,
    };
    const total = Math.max(1, flatRows.length);
    (doc.hazards || []).forEach((h) => normalizeHazardBounds(h, columns, total));
    return doc;
  }

  function documentToRenderLevel(doc) {
    const columns = doc.grid.columns;
    const rows = (doc.flattened?.rows || []).map((r) => ({
      blocks: r.blocks.slice(),
      gaps: r.gaps.slice(),
      macroPhase: r.macroPhase,
      globalRowIndex: r.globalRowIndex,
      segmentId: r.segmentId,
    }));
    return { columns, rows };
  }

  function documentToLegacyJsonLevel(doc) {
    const level = documentToRenderLevel(doc);
    return {
      columns: level.columns,
      rows: level.rows.map((r) => ({ blocks: r.blocks, gaps: r.gaps })),
    };
  }

  function parseDocument(raw) {
    let data = raw;
    if (typeof raw === "string") {
      data = JSON.parse(raw);
      if (typeof data === "string") data = JSON.parse(data);
    }
    if (!data || typeof data !== "object") throw new Error("Document must be an object.");

    if (data.kind === "stage-design" || data.schemaVersion) {
      migrateDocument(data);
      return flattenDocument(data);
    }

    // Legacy { columns, rows } import → single manual segment
    if (Array.isArray(data.rows)) {
      const columns = clampInt(data.columns ?? LIVE_GAME_COLUMNS, 4, 16);
      const rows = data.rows.map((r) => normalizeRow(r, columns));
      const doc = createEmptyDocument({ columns });
      doc.segments = [
        {
          id: nextSegmentId(),
          label: "Imported legacy JSON",
          macroPhase: "flow",
          source: "jsonImport",
          pathLab: null,
          rows,
        },
      ];
      return flattenDocument(doc);
    }

    throw new Error("Unrecognized JSON shape. Expected stage-design or { columns, rows }.");
  }

  function validateDocument(doc) {
    const errors = [];
    const warnings = [];
    const columns = doc?.grid?.columns ?? 0;
    if (columns < 4 || columns > 16) errors.push("grid.columns must be 4–16.");
    if (columns !== LIVE_GAME_COLUMNS) {
      warnings.push(
        `Grid has ${columns} columns; live game uses ${LIVE_GAME_COLUMNS} (Layout.ts).`
      );
    }
    if (!doc.segments?.length) errors.push("Stage must have at least one segment.");
    const hazardId = doc.stage?.signatureHazardId;
    if (hazardId && !SIGNATURE_HAZARD_IDS.some((h) => h.id === hazardId)) {
      warnings.push(`Unknown signatureHazardId: ${hazardId}`);
    }
    for (let i = 0; i < (doc.segments || []).length; i++) {
      const seg = doc.segments[i];
      if (!seg.rows?.length) warnings.push(`Segment "${seg.label}" has no rows.`);
      for (let j = 0; j < (seg.rows || []).length; j++) {
        const r = seg.rows[j];
        const blockSet = new Set(r.blocks);
        const gapSet = new Set(r.gaps);
        for (let c = 0; c < columns; c++) {
          const isBlock = blockSet.has(c);
          const isGap = gapSet.has(c);
          if (isBlock === isGap) {
            errors.push(`Row ${j} in "${seg.label}": column ${c} must be block XOR gap.`);
            break;
          }
        }
      }
    }
    return { errors, warnings, ok: errors.length === 0 };
  }

  function groupGapsToRanges(gaps, rowLength) {
    const sorted = normalizeUniqueInts(gaps || [], 0, Math.max(0, rowLength - 1));
    const ranges = [];
    let start = null;
    let prev = null;
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      if (start === null) {
        start = c;
        prev = c;
        continue;
      }
      if (c === prev + 1) {
        prev = c;
        continue;
      }
      ranges.push({ startCol: start, endCol: prev });
      start = c;
      prev = c;
    }
    if (start !== null) ranges.push({ startCol: start, endCol: prev });
    return ranges;
  }

  function overlapCols(a, b) {
    return Math.max(0, Math.min(a.endCol, b.endCol) - Math.max(a.startCol, b.startCol) + 1);
  }

  function computeFairnessWarnings(doc) {
    const warnings = [];
    const flat = doc.flattened?.rows || [];
    const columns = doc.grid.columns;
    for (let i = 1; i < flat.length; i++) {
      const prev = groupGapsToRanges(flat[i - 1].gaps, columns);
      const curr = groupGapsToRanges(flat[i].gaps, columns);
      if (!prev.length || !curr.length) continue;
      let hasOverlap = false;
      for (let a = 0; a < curr.length && !hasOverlap; a++) {
        for (let b = 0; b < prev.length; b++) {
          if (overlapCols(curr[a], prev[b]) >= 1) {
            hasOverlap = true;
            break;
          }
        }
      }
      if (!hasOverlap) {
        warnings.push(
          `No gap overlap between row ${i - 1} and row ${i} — may be unreachable (SH-005).`
        );
      }
    }
    return warnings;
  }

  function slugifyStageName(name) {
    return String(name || "stage")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "stage";
  }

  function exportDocumentJson(doc, pretty) {
    const copy = JSON.parse(JSON.stringify(flattenDocument(migrateDocument({ ...doc }))));
    copy.meta = copy.meta || {};
    copy.meta.exportedAt = new Date().toISOString();
    copy.meta.tool = "stage-design-lab";
    copy.meta.schemaVersion = SCHEMA_VERSION;
    if (global.StageDesignFairness?.attachFairnessReport) {
      global.StageDesignFairness.attachFairnessReport(copy);
    }
    return pretty ? JSON.stringify(copy, null, 2) : JSON.stringify(copy);
  }

  function summarizeHazards(doc) {
    const counts = {};
    (doc.hazards || []).forEach((h) => {
      counts[h.kind] = (counts[h.kind] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([k, n]) => `${k}×${n}`)
      .join(", ");
  }

  function applyStagePreset(doc, presetIndex) {
    const preset = STAGE_PRESETS.find((p) => p.index === presetIndex) || STAGE_PRESETS[0];
    doc.stage.index = preset.index;
    doc.stage.displayName = preset.displayName;
    doc.stage.signatureHazardId = preset.signatureHazardId;
    return flattenDocument(doc);
  }

  global.StageDesignSchema = {
    SCHEMA_VERSION,
    LIVE_GAME_COLUMNS,
    DEFAULT_ROW_HEIGHT_PX,
    DEFAULT_CELL_GAP_PX,
    DEFAULT_WATER_SPEED,
    MACRO_PHASES,
    SIGNATURE_HAZARD_IDS,
    HAZARD_KINDS,
    MARKER_KINDS,
    STAGE_PRESETS,
    PHASE_COLORS,
    clampInt,
    normalizeUniqueInts,
    normalizeRow,
    emptyRow,
    nextSegmentId,
    nextHazardId,
    nextTrackId,
    nextMarkerId,
    migrateDocument,
    normalizeHazardBounds,
    getHazardBounds,
    createSegment,
    createEmptyDocument,
    flattenDocument,
    documentToRenderLevel,
    documentToLegacyJsonLevel,
    parseDocument,
    validateDocument,
    computeFairnessWarnings,
    summarizeHazards,
    slugifyStageName,
    exportDocumentJson,
    applyStagePreset,
    computeGapsFromBlocks,
    groupGapsToRanges,
    overlapCols,
  };
})(typeof window !== "undefined" ? window : globalThis);
