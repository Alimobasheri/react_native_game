/**
 * Stage composer — segment/row CRUD, undo/redo, Path Lab import.
 */
(function (global) {
  "use strict";

  const S = () => global.StageDesignSchema;
  const G = () => global.StageDesignHazardGenerators;
  const MAX_HISTORY = 50;

  function cloneDoc(doc) {
    return S().flattenDocument(JSON.parse(JSON.stringify(doc)));
  }

  function createComposer(initialDoc) {
    let doc = S().flattenDocument(initialDoc || S().createEmptyDocument());
    let selectedSegmentId = doc.segments[0]?.id ?? null;
    let selectedGlobalRows = [];
    let selectedHazardId = null;
    const undoStack = [];
    const redoStack = [];

    function snapshot() {
      undoStack.push(JSON.stringify(doc));
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack.length = 0;
    }

    function getDocument() {
      return doc;
    }

    function setDocument(next, opts) {
      if (!opts?.skipHistory) snapshot();
      doc = S().flattenDocument(next);
      if (!doc.segments.some((seg) => seg.id === selectedSegmentId)) {
        selectedSegmentId = doc.segments[0]?.id ?? null;
      }
      selectedGlobalRows = selectedGlobalRows.filter((i) => i < (doc.flattened?.totalRows || 0));
      normalizeSelection();
      return doc;
    }

    function normalizeSelection() {
      if (!doc.segments.some((s) => s.id === selectedSegmentId)) {
        selectedSegmentId = doc.segments[0]?.id ?? null;
      }
      selectedGlobalRows = selectedGlobalRows.filter((i) => i < (doc.flattened?.totalRows || 0));
      if (selectedHazardId && !(doc.hazards || []).some((h) => h.id === selectedHazardId)) {
        selectedHazardId = null;
      }
    }

    function undo() {
      if (!undoStack.length) return null;
      redoStack.push(JSON.stringify(doc));
      doc = S().flattenDocument(JSON.parse(undoStack.pop()));
      normalizeSelection();
      return doc;
    }

    function redo() {
      if (!redoStack.length) return null;
      undoStack.push(JSON.stringify(doc));
      doc = S().flattenDocument(JSON.parse(redoStack.pop()));
      normalizeSelection();
      return doc;
    }

    function canUndo() {
      return undoStack.length > 0;
    }

    function canRedo() {
      return redoStack.length > 0;
    }

    function findSegment(id) {
      return doc.segments.find((s) => s.id === id) || null;
    }

    function findSegmentByGlobalRow(globalRowIndex) {
      let cursor = 0;
      for (let i = 0; i < doc.segments.length; i++) {
        const seg = doc.segments[i];
        const len = seg.rows.length;
        if (globalRowIndex >= cursor && globalRowIndex < cursor + len) {
          return { segment: seg, segmentIndex: i, localRowIndex: globalRowIndex - cursor };
        }
        cursor += len;
      }
      return null;
    }

    function getSelectedSegment() {
      return findSegment(selectedSegmentId);
    }

    function setSelectedSegment(id) {
      selectedSegmentId = id;
    }

    function setSelectedGlobalRows(indices) {
      selectedGlobalRows = (indices || [])
        .map((i) => Math.floor(Number(i)))
        .filter((i) => i >= 0 && i < (doc.flattened?.totalRows || 0))
        .sort((a, b) => a - b);
    }

    function getSelectedGlobalRows() {
      return selectedGlobalRows.slice();
    }

    function globalToSegmentLocal(globalRowIndex) {
      return findSegmentByGlobalRow(globalRowIndex);
    }

    function addSegment(args) {
      snapshot();
      const seg = S().createSegment({
        columns: doc.grid.columns,
        label: args?.label || "New segment",
        macroPhase: args?.macroPhase || "flow",
        rowCount: args?.rowCount ?? 4,
        source: args?.source || "manual",
        pathLab: args?.pathLab || null,
        id: args?.id,
      });
      if (args?.rows) {
        seg.rows = args.rows.map((r) => S().normalizeRow(r, doc.grid.columns));
      }
      if (typeof args?.insertAfterSegmentId === "string") {
        const idx = doc.segments.findIndex((s) => s.id === args.insertAfterSegmentId);
        if (idx >= 0) doc.segments.splice(idx + 1, 0, seg);
        else doc.segments.push(seg);
      } else {
        doc.segments.push(seg);
      }
      selectedSegmentId = seg.id;
      doc = S().flattenDocument(doc);
      return seg;
    }

    function deleteSegment(segmentId) {
      const idx = doc.segments.findIndex((s) => s.id === segmentId);
      if (idx < 0 || doc.segments.length <= 1) return false;
      snapshot();
      doc.segments.splice(idx, 1);
      if (selectedSegmentId === segmentId) {
        selectedSegmentId = doc.segments[Math.max(0, idx - 1)]?.id ?? doc.segments[0]?.id;
      }
      doc = S().flattenDocument(doc);
      return true;
    }

    function duplicateSegment(segmentId) {
      const seg = findSegment(segmentId);
      if (!seg) return null;
      return addSegment({
        label: `${seg.label} (copy)`,
        macroPhase: seg.macroPhase,
        source: seg.source,
        pathLab: seg.pathLab ? JSON.parse(JSON.stringify(seg.pathLab)) : null,
        rows: seg.rows.map((r) => ({ blocks: r.blocks.slice(), gaps: r.gaps.slice() })),
        insertAfterSegmentId: segmentId,
      });
    }

    function updateSegmentMeta(segmentId, patch) {
      const seg = findSegment(segmentId);
      if (!seg) return false;
      snapshot();
      if (patch.label != null) seg.label = String(patch.label);
      if (patch.macroPhase && S().MACRO_PHASES.includes(patch.macroPhase)) {
        seg.macroPhase = patch.macroPhase;
      }
      doc = S().flattenDocument(doc);
      return true;
    }

    function updateStageMeta(patch) {
      snapshot();
      doc.stage = doc.stage || {};
      if (patch.index != null) doc.stage.index = S().clampInt(patch.index, 1, 99);
      if (patch.displayName != null) doc.stage.displayName = String(patch.displayName);
      if (patch.signatureHazardId != null) doc.stage.signatureHazardId = patch.signatureHazardId;
      if (patch.waterSpeedPxPerSec != null) {
        doc.stage.waterSpeedPxPerSec = Math.max(20, Number(patch.waterSpeedPxPerSec) || 350);
        doc.playback.waterSpeedPxPerSec = doc.stage.waterSpeedPxPerSec;
      }
      if (patch.notes != null) {
        doc.meta = doc.meta || {};
        doc.meta.notes = String(patch.notes);
      }
      doc = S().flattenDocument(doc);
      return doc;
    }

    function setGridColumns(columns) {
      const next = S().clampInt(columns, 4, 16);
      if (next === doc.grid.columns) return doc;
      snapshot();
      const oldCols = doc.grid.columns;
      doc.grid.columns = next;
      for (const seg of doc.segments) {
        seg.rows = seg.rows.map((r) => {
          const norm = S().normalizeRow(r, next);
          if (next < oldCols) return norm;
          return norm;
        });
      }
      doc = S().flattenDocument(doc);
      return doc;
    }

    function insertRows(args) {
      const count = Math.max(1, S().clampInt(args.count ?? 1, 1, 100));
      const columns = doc.grid.columns;
      const emptyRows = [];
      for (let i = 0; i < count; i++) {
        emptyRows.push(S().normalizeRow(S().emptyRow(columns), columns));
      }

      snapshot();
      const mode = args.mode || "end"; // start | end | above | below
      let seg = args.segmentId ? findSegment(args.segmentId) : getSelectedSegment();
      if (!seg) seg = doc.segments[doc.segments.length - 1];

      if (mode === "start") {
        seg.rows.unshift(...emptyRows.map((r) => ({ ...r })));
      } else if (mode === "end") {
        seg.rows.push(...emptyRows.map((r) => ({ ...r })));
      } else if (mode === "above" || mode === "below") {
        const globalRow = S().clampInt(
          args.globalRowIndex ?? selectedGlobalRows[0] ?? 0,
          0,
          Math.max(0, doc.flattened.totalRows - 1)
        );
        const hit = findSegmentByGlobalRow(globalRow);
        if (!hit) {
          seg.rows.push(...emptyRows);
        } else {
          const insertAt = mode === "above" ? hit.localRowIndex : hit.localRowIndex + 1;
          hit.segment.rows.splice(insertAt, 0, ...emptyRows.map((r) => ({ ...r })));
          selectedSegmentId = hit.segment.id;
        }
      } else {
        seg.rows.push(...emptyRows);
      }

      doc = S().flattenDocument(doc);
      return doc;
    }

    function deleteSelectedRows() {
      if (!selectedGlobalRows.length) return false;
      snapshot();
      const toDelete = selectedGlobalRows.slice().sort((a, b) => b - a);
      for (const globalRow of toDelete) {
        const hit = findSegmentByGlobalRow(globalRow);
        if (!hit) continue;
        if (hit.segment.rows.length <= 1 && doc.segments.length <= 1) continue;
        hit.segment.rows.splice(hit.localRowIndex, 1);
        if (hit.segment.rows.length === 0) {
          const idx = doc.segments.indexOf(hit.segment);
          if (doc.segments.length > 1) doc.segments.splice(idx, 1);
        }
      }
      selectedGlobalRows = [];
      doc = S().flattenDocument(doc);
      if (doc.segments.length) selectedSegmentId = doc.segments[0].id;
      return true;
    }

    function toggleCell(globalRowIndex, col) {
      const hit = findSegmentByGlobalRow(globalRowIndex);
      if (!hit) return false;
      snapshot();
      const row = hit.segment.rows[hit.localRowIndex];
      const columns = doc.grid.columns;
      const c = S().clampInt(col, 0, columns - 1);
      const hasBlock = row.blocks.includes(c);
      if (hasBlock) {
        row.blocks = row.blocks.filter((v) => v !== c);
        if (!row.gaps.includes(c)) row.gaps.push(c);
      } else {
        row.blocks = [...row.blocks, c];
        row.gaps = row.gaps.filter((v) => v !== c);
      }
      row.blocks = S().normalizeUniqueInts(row.blocks, 0, columns - 1);
      row.gaps = S().normalizeUniqueInts(row.gaps, 0, columns - 1);
      doc = S().flattenDocument(doc);
      return true;
    }

    function importPathLabLevel(level, config, label, macroPhase) {
      const columns = level.columns || doc.grid.columns;
      if (columns !== doc.grid.columns) {
        setGridColumns(columns);
      }
      const rows = (level.rows || []).map((r) =>
        S().normalizeRow({ blocks: r.blocks, gaps: r.gaps }, columns)
      );
      return addSegment({
        label: label || `Path: ${config.segment}`,
        macroPhase: macroPhase || "flow",
        source: "pathLab",
        pathLab: { ...config },
        rows,
        insertAfterSegmentId: selectedSegmentId || undefined,
      });
    }

    function rerollSegment(segmentId, newPathRunId) {
      const seg = findSegment(segmentId);
      if (!seg || seg.source !== "pathLab" || !seg.pathLab) return null;
      if (typeof global.PathLab === "undefined") return null;
      const cfg = { ...seg.pathLab, pathRunId: newPathRunId ?? (seg.pathLab.pathRunId || 0) + 1 };
      const level = global.PathLab.buildLevel(cfg);
      snapshot();
      seg.rows = (level.rows || []).map((r) =>
        S().normalizeRow({ blocks: r.blocks, gaps: r.gaps }, doc.grid.columns)
      );
      seg.pathLab = cfg;
      doc = S().flattenDocument(doc);
      return doc;
    }

    function importDirectedMacroLoop(readPathLabConfig, mergeTuning) {
      if (typeof global.PathLab === "undefined") return null;
      const tuning = mergeTuning();
      const cycle = global.PathLab.getPacingCycleState(tuning, 0);
      const totalRows =
        cycle.flowRows + cycle.tensionRows + cycle.climaxRows + cycle.releaseRows;
      const cfg = readPathLabConfig(tuning);
      cfg.segment = "directedMacro";
      cfg.rowCount = totalRows;
      cfg.columns = doc.grid.columns;
      const level = global.PathLab.buildLevel(cfg);
      snapshot();
      doc.segments = [];
      doc.hazards = doc.hazards || [];
      doc.markers = doc.markers || [];
      const phases = [
        { phase: "flow", rows: cycle.flowRows, label: "FLOW" },
        { phase: "tension", rows: cycle.tensionRows, label: "TENSION" },
        { phase: "climax", rows: cycle.climaxRows, label: "CLIMAX" },
        { phase: "release", rows: cycle.releaseRows, label: "RELEASE" },
      ];
      let offset = 0;
      for (const p of phases) {
        const slice = (level.rows || []).slice(offset, offset + p.rows).map((r) =>
          S().normalizeRow({ blocks: r.blocks, gaps: r.gaps }, doc.grid.columns)
        );
        offset += p.rows;
        doc.segments.push({
          id: S().nextSegmentId(),
          label: p.label,
          macroPhase: p.phase,
          source: "pathLab",
          pathLab: { ...cfg, macroPhaseSlice: p.phase, rowCount: p.rows },
          rows: slice,
        });
      }
      selectedSegmentId = doc.segments[0]?.id;
      doc = S().flattenDocument(doc);
      return doc;
    }

    function setSelectedRowMacroPhase(macroPhase) {
      if (!S().MACRO_PHASES.includes(macroPhase)) return false;
      const rows = getSelectedGlobalRows();
      if (!rows.length) return false;
      snapshot();
      for (const gr of rows) {
        const hit = findSegmentByGlobalRow(gr);
        if (!hit) continue;
        hit.segment.rows[hit.localRowIndex].macroPhase = macroPhase;
      }
      doc = S().flattenDocument(doc);
      return true;
    }

    function getSelectedHazardId() {
      return selectedHazardId;
    }

    function setSelectedHazardId(id) {
      selectedHazardId = id;
    }

    function addHazard(hazard) {
      snapshot();
      doc.hazards = doc.hazards || [];
      const hz = { id: hazard.id || S().nextHazardId(), renderLayer: "machinery", ...hazard };
      doc.hazards.push(hz);
      selectedHazardId = hz.id;
      doc = S().flattenDocument(doc);
      return hz;
    }

    function deleteHazard(hazardId) {
      snapshot();
      doc.hazards = (doc.hazards || []).filter((h) => h.id !== hazardId);
      doc.proceduralBindings = (doc.proceduralBindings || []).map((b) => ({
        ...b,
        hazardIds: (b.hazardIds || []).filter((id) => id !== hazardId),
      }));
      if (selectedHazardId === hazardId) selectedHazardId = null;
      doc = S().flattenDocument(doc);
    }

    function clearCanvas() {
      snapshot();
      const columns = doc.grid.columns;
      doc.hazards = [];
      doc.markers = [];
      doc.proceduralBindings = [];
      for (const seg of doc.segments) {
        for (let i = 0; i < seg.rows.length; i++) {
          seg.rows[i] = S().normalizeRow(S().emptyRow(columns), columns);
        }
      }
      selectedHazardId = null;
      selectedGlobalRows = [];
      doc = S().flattenDocument(doc);
      return doc;
    }

    function updateHazard(hazardId, patch) {
      const hz = (doc.hazards || []).find((h) => h.id === hazardId);
      if (!hz) return false;
      snapshot();
      if (patch.params) hz.params = { ...hz.params, ...patch.params };
      if (patch.anchor) hz.anchor = { ...hz.anchor, ...patch.anchor };
      if (patch.phases) hz.phases = patch.phases;
      if (patch.trackId !== undefined) hz.trackId = patch.trackId;
      if (patch.bounds) {
        hz.bounds = { ...hz.bounds, ...patch.bounds };
      }
      doc = S().flattenDocument(doc);
      return true;
    }

    function createHazardInBounds(kind, bounds, extra) {
      const cat = global.StageDesignHazardCatalog?.getByKind?.(kind);
      const columns = doc.grid.columns;
      const b = {
        rowStart: bounds.rowStart,
        rowEnd: bounds.rowEnd,
        colStart: bounds.colStart,
        colEnd: bounds.colEnd,
      };
      const rowSpan = b.rowEnd - b.rowStart + 1;
      const params = { ...(cat?.params || {}), ...(extra?.params || {}) };
      if (kind === "hazard_platform") {
        params.pressDirection =
          params.pressDirection || global.StageDesignHazardCatalog?.inferPressDirection?.(b, columns) || "right";
        params.pressCols = params.pressCols ?? 1;
        params.pressDurationSec = params.pressDurationSec ?? 0.8;
        params.pressEase = params.pressEase || "ease-out";
      }
      if (kind === "pattern_sliding_gap") {
        params.rowSpan = rowSpan;
      }
      if (kind === "hazard_buzz_wheel") {
        params.column = (b.colStart + b.colEnd) / 2;
      }
      const phases =
        extra?.phases ||
        (kind === "hazard_platform"
          ? [
              { name: "pressing", durationSec: params.pressDurationSec ?? 0.8 },
              { name: "held", durationSec: 0.25 },
            ]
          : kind === "hazard_iris_clamp"
          ? [
              { name: "open", durationSec: 0.2 },
              { name: "closing", durationSec: params.closeDurationSec ?? 0.9 },
              { name: "closed", durationSec: 0.3 },
            ]
          : kind === "hazard_tilt_gate"
            ? [
                { name: "open", durationSec: 0.15 },
                { name: "closing", durationSec: params.closeDurationSec ?? 0.7 },
                { name: "closed", durationSec: 0.25 },
              ]
            : []);
      return addHazard({
        kind,
        bounds: b,
        anchor: { globalRowIndex: b.rowStart },
        params,
        phases,
        ...extra,
      });
    }

    function updateHazardBounds(hazardId, bounds) {
      return updateHazard(hazardId, { bounds });
    }

    function findHazardAtCell(globalRowIndex, col) {
      for (const hz of doc.hazards || []) {
        const b = S().getHazardBounds(hz);
        if (globalRowIndex >= b.rowStart && globalRowIndex <= b.rowEnd && col >= b.colStart && col <= b.colEnd) {
          return hz;
        }
      }
      return null;
    }

    function applyTemplateInBounds(kind, bounds) {
      const columns = doc.grid.columns;
      let b = {
        rowStart: Math.min(bounds.rowStart, bounds.rowEnd),
        rowEnd: Math.max(bounds.rowStart, bounds.rowEnd),
        colStart: Math.min(bounds.colStart, bounds.colEnd),
        colEnd: Math.max(bounds.colStart, bounds.colEnd),
      };
      b.colStart = Math.max(0, Math.min(b.colStart, columns - 1));
      b.colEnd = Math.max(0, Math.min(b.colEnd, columns - 1));

      const hz = createHazardInBounds(kind, b);
      return { hazard: hz };
    }

    function addMarker(marker) {
      snapshot();
      doc.markers = doc.markers || [];
      const mk = { id: marker.id || S().nextMarkerId(), ...marker };
      doc.markers.push(mk);
      doc = S().flattenDocument(doc);
      return mk;
    }

    function deleteMarker(markerId) {
      snapshot();
      doc.markers = (doc.markers || []).filter((m) => m.id !== markerId);
      doc = S().flattenDocument(doc);
    }

    function addTrack(track) {
      snapshot();
      doc.tracks = doc.tracks || [];
      const tr = { id: track.id || S().nextTrackId(), ...track };
      doc.tracks.push(tr);
      doc = S().flattenDocument(doc);
      return tr;
    }

    function globalRowForNewSegment(insertAfterSegmentId) {
      let start = 0;
      for (const s of doc.segments || []) {
        if (insertAfterSegmentId && s.id === insertAfterSegmentId) {
          return start + s.rows.length;
        }
        start += s.rows.length;
      }
      return start;
    }

    function applyWizard(fnName, params, opts) {
      if (!G()?.run) return null;
      snapshot();
      const insertAfterId = getSelectedSegment()?.id;
      const segmentStartRow =
        opts?.startGlobalRow ?? globalRowForNewSegment(insertAfterId);
      const result = G().run(fnName, params || {}, doc.grid.columns, segmentStartRow);
      const seg = addSegment({
        label: opts?.label || fnName,
        macroPhase: opts?.macroPhase || "tension",
        source: "procedural",
        rows: result.rows,
        insertAfterSegmentId: insertAfterId,
      });
      doc.hazards = doc.hazards || [];
      doc.tracks = doc.tracks || [];
      doc.markers = doc.markers || [];
      doc.proceduralBindings = doc.proceduralBindings || [];
      result.hazards.forEach((h) => {
        h.anchor = h.anchor || {};
        if (h.anchor.globalRowIndex == null) {
          h.anchor.globalRowIndex = h.bounds?.rowStart ?? segmentStartRow;
        }
        doc.hazards.push(h);
      });
      result.tracks.forEach((t) => doc.tracks.push(t));
      result.markers.forEach((m) => doc.markers.push(m));
      if (result.binding) {
        doc.proceduralBindings.push({
          segmentId: seg.id,
          ...result.binding,
        });
      }
      if (Array.isArray(result.harmonizerWarnings) && result.harmonizerWarnings.length) {
        doc.meta = doc.meta || {};
        doc.meta.harmonizerWarnings = [
          ...(doc.meta.harmonizerWarnings || []),
          ...result.harmonizerWarnings,
        ];
      }
      doc = S().flattenDocument(doc);
      return { segment: seg, result };
    }

    function rerollProceduralBinding(bindingIndex, seedBump) {
      const binding = (doc.proceduralBindings || [])[bindingIndex];
      if (!binding || !G()?.rerollBinding) return null;
      snapshot();
      const seg = findSegment(binding.segmentId);
      if (!seg) return null;
      let startRow = 0;
      for (const s of doc.segments) {
        if (s.id === seg.id) break;
        startRow += s.rows.length;
      }
      (binding.hazardIds || []).forEach((id) => {
        doc.hazards = (doc.hazards || []).filter((h) => h.id !== id);
      });
      const result = G().rerollBinding(binding, doc.grid.columns, startRow, seedBump);
      seg.rows = result.rows.map((r) => S().normalizeRow(r, doc.grid.columns));
      seg.source = "procedural";
      result.hazards.forEach((h) => doc.hazards.push(h));
      result.tracks.forEach((t) => doc.tracks.push(t));
      result.markers.forEach((m) => doc.markers.push(m));
      binding.params = result.binding.params;
      binding.hazardIds = result.binding.hazardIds;
      doc = S().flattenDocument(doc);
      return doc;
    }

    function findProceduralBindingIndex(segmentId, fnName) {
      const bindings = doc.proceduralBindings || [];
      if (segmentId) {
        const idx = bindings.findIndex((b) => b.segmentId === segmentId && b.fn === fnName);
        if (idx >= 0) return idx;
      }
      return bindings.findIndex((b) => b.fn === fnName);
    }

    function rerollPressIntroShaft(opts) {
      const segId = opts?.segmentId ?? getSelectedSegment()?.id;
      const idx = findProceduralBindingIndex(segId, "composePressIntroShaft");
      if (idx < 0) return null;
      const before = (doc.proceduralBindings || [])[idx];
      const updated = rerollProceduralBinding(idx, opts?.seedBump ?? 1);
      if (!updated) return null;
      const binding = (doc.proceduralBindings || [])[idx];
      const seg = findSegment(binding?.segmentId);
      return {
        segment: seg,
        binding,
        seed: binding?.params?.seed ?? 0,
        previousSeed: before?.params?.seed ?? 0,
      };
    }

    function insertPressTeach(opts) {
      return applyWizard(
        "composePressIntroShaft",
        { difficulty01: opts?.difficulty01 ?? 0.2, seed: opts?.seed ?? 0 },
        { macroPhase: opts?.macroPhase || "flow", label: opts?.label || "Press intro shaft" }
      );
    }

    function insertPathChicanePreview(opts) {
      return applyWizard(
        "composePathChicane",
        {
          difficulty01: opts?.difficulty01 ?? 0.2,
          seed: opts?.seed ?? 0,
          previewOnly: true,
          rowCount: opts?.rowCount ?? 40,
        },
        { macroPhase: opts?.macroPhase || "flow", label: opts?.label || "Path chicane preview" }
      );
    }

    function insertPathChicaneShaft(opts) {
      return applyWizard(
        "composePathChicane",
        {
          difficulty01: opts?.difficulty01 ?? 0.2,
          seed: opts?.seed ?? 0,
          previewOnly: false,
          rowCount: opts?.rowCount ?? 40,
        },
        { macroPhase: opts?.macroPhase || "flow", label: opts?.label || "Path chicane shaft" }
      );
    }

    function loadStageSkeleton(presetIndex) {
      const preset = S().STAGE_PRESETS.find((p) => p.index === presetIndex);
      if (!preset) return null;
      updateStageMeta({
        index: preset.index,
        displayName: preset.displayName,
        signatureHazardId: preset.signatureHazardId,
      });
      if (preset.signatureHazardId === "hazard_vise" || preset.signatureHazardId === "hazard_platform") {
        const row = Math.max(0, doc.flattened.totalRows - 6);
        createHazardInBounds(
          "hazard_platform",
          { rowStart: row, rowEnd: row + 2, colStart: 0, colEnd: 1 },
          { params: { pressDirection: "right", pressCols: 2, pressDurationSec: 0.9 } }
        );
        createHazardInBounds(
          "hazard_platform",
          { rowStart: row + 3, rowEnd: row + 5, colStart: 4, colEnd: 5 },
          { params: { pressDirection: "left", pressCols: 2, pressDurationSec: 0.9 } }
        );
        return { placed: "platforms" };
      }
      if (preset.signatureHazardId === "hazard_iris_clamp") {
        return applyWizard("irisClampRow", { preset: "narrowPreset" }, { macroPhase: "climax", label: "Iris clamp" });
      }
      if (preset.signatureHazardId === "hazard_buzz_wheel") {
        return applyWizard("buzzWheel", { mode: "drift" }, { macroPhase: "tension", label: "Buzz drift" });
      }
      return null;
    }

    return {
      getDocument,
      setDocument,
      undo,
      redo,
      canUndo,
      canRedo,
      cloneDoc,
      findSegment,
      findSegmentByGlobalRow,
      getSelectedSegment,
      setSelectedSegment,
      setSelectedGlobalRows,
      getSelectedGlobalRows,
      globalToSegmentLocal,
      addSegment,
      deleteSegment,
      duplicateSegment,
      updateSegmentMeta,
      updateStageMeta,
      setGridColumns,
      insertRows,
      deleteSelectedRows,
      toggleCell,
      importPathLabLevel,
      rerollSegment,
      importDirectedMacroLoop,
      setSelectedRowMacroPhase,
      getSelectedHazardId,
      setSelectedHazardId,
      addHazard,
      deleteHazard,
      clearCanvas,
      updateHazard,
      createHazardInBounds,
      updateHazardBounds,
      findHazardAtCell,
      applyTemplateInBounds,
      addMarker,
      deleteMarker,
      addTrack,
      applyWizard,
      insertPressTeach,
      insertPathChicanePreview,
      insertPathChicaneShaft,
      rerollPressIntroShaft,
      rerollProceduralBinding,
      loadStageSkeleton,
    };
  }

  global.StageDesignComposer = { createComposer, cloneDoc };
})(typeof window !== "undefined" ? window : globalThis);
