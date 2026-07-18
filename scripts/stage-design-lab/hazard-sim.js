/**
 * Hazard simulation — effective gap masks and draw states at playback time.
 */
(function (global) {
  "use strict";

  const S = () => global.StageDesignSchema;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function rowEnterSec(doc, globalRowIndex) {
    const rowHeight = doc.playback?.rowHeightPx || doc.grid?.rowHeightPx || 24;
    const speed = doc.playback?.waterSpeedPxPerSec || doc.stage?.waterSpeedPxPerSec || 350;
    return (globalRowIndex * rowHeight) / Math.max(1, speed);
  }

  function rowLocalSec(doc, globalRowIndex, elapsedSec) {
    return Math.max(0, elapsedSec - rowEnterSec(doc, globalRowIndex));
  }

  function waterPosition(doc, elapsedSec) {
    const rowHeight = doc.playback?.rowHeightPx || doc.grid?.rowHeightPx || 24;
    const speed = doc.playback?.waterSpeedPxPerSec || doc.stage?.waterSpeedPxPerSec || 350;
    const columns = doc.grid?.columns ?? 6;
    const waterRowIndex = (elapsedSec * speed) / Math.max(1, rowHeight);
    const rowBase = Math.floor(waterRowIndex);
    const rowFrac = waterRowIndex - rowBase;
    const waterColIndex = rowFrac * columns;
    const waterCol = Math.min(columns - 1, Math.max(0, Math.floor(waterColIndex)));
    return { waterRowIndex, rowBase, rowFrac, waterColIndex, waterCol, columns };
  }

  function usesAnimStartTime(hazard) {
    const v = hazard.params?.animStartSec;
    return v != null && Number.isFinite(Number(v));
  }

  function hazardAnimStartRow(doc, hazard) {
    const p = hazard.params || {};
    const b = hazard.bounds || {};
    const platformRow = b.rowStart ?? hazard.anchor?.globalRowIndex ?? 0;
    const total = doc.flattened?.totalRows ?? 1;
    if (p.animStartRow != null && Number.isFinite(Number(p.animStartRow))) {
      return clamp(Math.round(Number(p.animStartRow)), 0, Math.max(0, total - 1));
    }
    return platformRow;
  }

  function hazardAnimStartThreshold(doc, hazard) {
    return { startRow: hazardAnimStartRow(doc, hazard) };
  }

  function hazardAnimStartSec(doc, hazard) {
    if (usesAnimStartTime(hazard)) {
      return Number(hazard.params.animStartSec);
    }
    return rowEnterSec(doc, hazardAnimStartRow(doc, hazard));
  }

  function hazardAnimLocalSec(doc, hazard, elapsedSec) {
    if (usesAnimStartTime(hazard)) {
      return Math.max(0, elapsedSec - hazardAnimStartSec(doc, hazard));
    }
    const startRow = hazardAnimStartRow(doc, hazard);
    if (waterPosition(doc, elapsedSec).waterRowIndex < startRow) return 0;
    return Math.max(0, elapsedSec - rowEnterSec(doc, startRow));
  }

  function hazardAnimWaiting(doc, hazard, elapsedSec) {
    if (usesAnimStartTime(hazard)) {
      return elapsedSec < hazardAnimStartSec(doc, hazard);
    }
    return waterPosition(doc, elapsedSec).waterRowIndex < hazardAnimStartRow(doc, hazard);
  }

  const PRESS_EASE = {
    linear: (t) => t,
    "ease-in": (t) => t * t * t,
    "ease-out": (t) => 1 - Math.pow(1 - t, 3),
    "ease-in-out": (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };

  function applyPressEase(t, kind) {
    const fn = PRESS_EASE[kind] || PRESS_EASE["ease-out"];
    return fn(clamp(t, 0, 1));
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  function gapColsFromWidth(columns, gapWidth, centerCol) {
    const w = Math.max(1, Math.round(gapWidth));
    const center = centerCol != null ? centerCol : (columns - 1) / 2;
    let start = Math.round(center - (w - 1) / 2);
    start = clamp(start, 0, columns - w);
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

  function phaseProgress(hazard, localSec) {
    const phases = hazard.phases || [];
    let t = localSec;
    for (let i = 0; i < phases.length; i++) {
      const dur = phases[i].durationSec || 0;
      if (t <= dur) return { phase: phases[i].name, progress: dur > 0 ? t / dur : 1, index: i };
      t -= dur;
    }
    const last = phases[phases.length - 1];
    return { phase: last?.name || "closed", progress: 1, index: phases.length - 1 };
  }

  function simIris(hazard, columns, localSec) {
    const p = hazard.params || {};
    const openW = p.openGapCols ?? Math.max(2, columns - 2);
    const closedW = p.closedGapCols ?? Math.max(1, Math.floor(columns / 3));
    const { phase, progress } = phaseProgress(hazard, localSec);
    let gapW = openW;
    if (phase === "closing") gapW = lerp(openW, closedW, progress);
    else if (phase === "closed") gapW = closedW;
    const gaps = gapColsFromWidth(columns, gapW);
    const leftInset = p.leftPanCol ?? 0;
    const rightInset = p.rightPanCol ?? columns - 1;
    const closeT = phase === "closing" ? progress : phase === "closed" ? 1 : 0;
    return {
      gaps,
      blocks: blocksFromGaps(columns, gaps),
      draw: {
        kind: "hazard_iris_clamp",
        leftPanCol: lerp(leftInset, gaps[0] - 1, closeT),
        rightPanCol: lerp(rightInset, gaps[gaps.length - 1] + 1, closeT),
        telegraph: localSec < 0.01 && (p.telegraphRows || 0) > 0,
        phase,
        progress: closeT,
      },
    };
  }

  function simVise(hazard, columns, localSec, rowIndex, doc) {
    const p = hazard.params || {};
    const b = hazard.bounds || {};
    const anchor = b.rowStart ?? hazard.anchor?.globalRowIndex ?? 0;
    const span = (b.rowEnd ?? anchor) - anchor + 1;
    const step = rowIndex - anchor;
    if (step < 0 || step >= span) return null;
    const startW = p.startGapCols ?? Math.max(2, columns - 2);
    const endW = p.endGapCols ?? Math.max(1, 2);
    const t = span <= 1 ? 1 : step / (span - 1);
    const gapW = lerp(startW, endW, t);
    const drift = (p.driftCols || 0) * t;
    const center = (columns - 1) / 2 + drift;
    const gaps = gapColsFromWidth(columns, gapW, center);
    const leftJaw = [];
    const rightJaw = [];
    for (let c = 0; c < gaps[0]; c++) leftJaw.push(c);
    for (let c = gaps[gaps.length - 1] + 1; c < columns; c++) rightJaw.push(c);
    return {
      gaps,
      blocks: blocksFromGaps(columns, gaps),
      draw: {
        kind: "hazard_vise",
        leftJawCols: leftJaw,
        rightJawCols: rightJaw,
        step,
        span,
      },
    };
  }

  function simTilt(hazard, columns, localSec) {
    const p = hazard.params || {};
    const side = p.side || "left";
    const gapCols = p.gapCols ?? Math.max(1, columns - 2);
    const { phase, progress } = phaseProgress(hazard, localSec);
    let angle = 90;
    if (phase === "closing") angle = lerp(90, 0, progress);
    else if (phase === "closed") angle = 0;
    const gaps = gapColsFromWidth(columns, gapCols, side === "left" ? gapCols / 2 + 0.5 : columns - gapCols / 2 - 1);
    return {
      gaps,
      blocks: blocksFromGaps(columns, gaps),
      draw: {
        kind: "hazard_tilt_gate",
        side,
        angleDeg: angle,
        pivotCol: side === "left" ? 0 : columns - 1,
        phase,
        progress,
      },
    };
  }

  function trackColumnAt(track, tSec) {
    const kf = track.keyframes || [];
    if (!kf.length) return 0;
    if (kf.length === 1) return kf[0].column;
    let prev = kf[0];
    for (let i = 1; i < kf.length; i++) {
      const next = kf[i];
      if (tSec <= next.tSec) {
        const span = next.tSec - prev.tSec;
        const u = span > 0 ? (tSec - prev.tSec) / span : 0;
        return lerp(prev.column, next.column, u);
      }
      prev = next;
    }
    if (track.mode === "pingpong") {
      const last = kf[kf.length - 1];
      const first = kf[0];
      const cycle = (last.tSec - first.tSec) * 2 || 1;
      const mod = tSec % cycle;
      if (mod <= last.tSec - first.tSec) return trackColumnAt({ ...track, mode: "linear", keyframes: kf }, mod + first.tSec);
      return trackColumnAt(
        { ...track, mode: "linear", keyframes: [...kf].reverse().map((k, i) => ({ tSec: i * (last.tSec - first.tSec) / Math.max(1, kf.length - 1), column: k.column })) },
        cycle - mod
      );
    }
    return kf[kf.length - 1].column;
  }

  function simBuzz(hazard, columns, localSec, elapsedSec, doc) {
    const p = hazard.params || {};
    const col = p.column ?? Math.floor(columns / 2);
    let xCol = col;
    if (hazard.trackId && doc.tracks) {
      const track = doc.tracks.find((t) => t.id === hazard.trackId);
      if (track) xCol = trackColumnAt(track, elapsedSec);
    }
    const spinRpm = p.spinRpm ?? 120;
    const angle = ((elapsedSec * spinRpm * 360) / 60) % 360;
    return {
      gaps: null,
      blocks: null,
      draw: {
        kind: "hazard_buzz_wheel",
        column: xCol,
        spinAngleDeg: angle,
        spinRpm,
        radiusFrac: p.radiusFrac ?? 0.35,
      },
    };
  }

  function simSlidingGap(hazard, columns, rowIndex, doc) {
    const p = hazard.params || {};
    const b = hazard.bounds || {};
    const anchor = b.rowStart ?? hazard.anchor?.globalRowIndex ?? 0;
    const span = (b.rowEnd ?? anchor) - anchor + 1;
    const step = rowIndex - anchor;
    if (step < 0 || step >= span) return null;
    const startCol = p.startGapCenter ?? 1;
    const endCol = p.endGapCenter ?? columns - 2;
    const gapW = p.gapCols ?? 2;
    const t = span <= 1 ? 1 : step / (span - 1);
    const center = lerp(startCol, endCol, t);
    const gaps = gapColsFromWidth(columns, gapW, center);
    return { gaps, blocks: blocksFromGaps(columns, gaps), draw: { kind: "pattern_sliding_gap", center, step } };
  }

  /** Smoothstep — must match pistonEaseInOut in src/Game/hazards/pistonMotion.ts. */
  function pistonEaseInOut(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  /** Ping-pong 0..1: extend (ease) → hold at tip → retract (ease). Mirrors pistonExtension01. */
  function pistonExtension01(motionSec, speedRowsPerSec, trackLengthRows, holdAtTipSec) {
    const speed = Math.max(0.05, speedRowsPerSec);
    const track = Math.max(0.25, trackLengthRows);
    const travelSec = track / speed;
    const hold = Math.max(0, holdAtTipSec);
    const halfCycle = travelSec + hold;
    const fullCycle = halfCycle * 2;
    if (fullCycle <= 0.001) return 0;
    const t = ((motionSec % fullCycle) + fullCycle) % fullCycle;
    if (t <= travelSec) return pistonEaseInOut(t / travelSec);
    if (t <= halfCycle) return 1;
    const retractT = t - halfCycle;
    if (retractT <= travelSec) return 1 - pistonEaseInOut(retractT / travelSec);
    return 0;
  }

  function simPiston(hazard, columns, localSec, doc) {
    const p = hazard.params || {};
    const b = hazard.bounds || {};
    const mount = p.mount === "ceiling" ? "ceiling" : "floor";
    const rowStart = b.rowStart ?? 0;
    const rowEnd = b.rowEnd ?? rowStart;
    const spanRows = rowEnd - rowStart + 1;
    const column = clamp(Math.round(p.column ?? b.colStart ?? 0), 0, columns - 1);
    const trackRows = Math.max(0.5, Number(p.trackLengthRows) || Math.max(1, spanRows - 1));
    const rowHeight = doc.playback?.rowHeightPx || doc.grid?.rowHeightPx || 24;
    const speedPx = doc.playback?.waterSpeedPxPerSec || doc.stage?.waterSpeedPxPerSec || 350;
    const rowDurationSec = rowHeight / Math.max(1, speedPx);
    const telegraphSec = Math.max(0, Number(p.telegraphDelayRows) || 0) * rowDurationSec;
    const pulseSec = 0.5;
    const motionStarted = localSec >= telegraphSec;
    const motionSec = motionStarted ? localSec - telegraphSec : 0;

    let telegraphPulse01 = 0;
    if (!motionStarted && telegraphSec > 0 && localSec > 0) {
      const remaining = telegraphSec - localSec;
      if (remaining <= pulseSec) {
        const pulseT = 1 - remaining / pulseSec;
        telegraphPulse01 = 0.5 + 0.5 * Math.sin(pulseT * Math.PI * 6);
      }
    }

    const extension01 = motionStarted
      ? pistonExtension01(
          motionSec,
          Number(p.speedRowsPerSec) || 1.5,
          trackRows,
          p.holdAtTipSec != null ? Number(p.holdAtTipSec) : 0.18
        )
      : 0;

    return {
      // Bounce hazard — never seals gaps; water/gap masks stay untouched.
      gaps: null,
      blocks: null,
      draw: {
        kind: "hazard_piston",
        mount,
        column,
        extension01,
        trackRows,
        mountRow: mount === "floor" ? rowStart : rowEnd,
        rowSpan: spanRows,
        telegraphPulse01,
        motionStarted,
      },
    };
  }

  function platformSlabExtents(b, pressDir, pressExtent, columns) {
    let slabStart = b.colStart;
    let slabEnd = b.colEnd + 1;
    if (pressDir === "right") slabEnd = b.colEnd + 1 + pressExtent;
    else slabStart = b.colStart - pressExtent;
    slabStart = Math.max(0, slabStart);
    slabEnd = Math.min(columns, slabEnd);
    return { slabStart, slabEnd };
  }

  function blockColsFromSlab(slabStart, slabEnd, columns) {
    const blockCols = [];
    for (let c = 0; c < columns; c++) {
      const overlap = Math.min(slabEnd, c + 1) - Math.max(slabStart, c);
      if (overlap > 0.001) blockCols.push(c);
    }
    return blockCols;
  }

  function simPlatform(hazard, columns, localSec, rowIndex) {
    const b = hazard.bounds;
    if (!b || rowIndex < b.rowStart || rowIndex > b.rowEnd) return null;
    const p = hazard.params || {};
    const pressCols = Math.max(0, p.pressCols ?? 1);
    const pressDir = p.pressDirection || "right";
    const pressDuration = Math.max(0.05, p.pressDurationSec ?? 0.8);

    let pressT = 0;
    if (localSec > 0) {
      pressT = applyPressEase(Math.min(1, localSec / pressDuration), p.pressEase || "ease-out");
    }

    const pressExtent = pressCols * pressT;
    const { slabStart, slabEnd } = platformSlabExtents(b, pressDir, pressExtent, columns);
    const blockCols = blockColsFromSlab(slabStart, slabEnd, columns);
    const cs = Math.max(0, Math.floor(slabStart));
    const ce = Math.min(columns - 1, Math.max(cs, Math.ceil(slabEnd) - 1));

    return {
      blockCols,
      draw: {
        kind: "hazard_platform",
        slabStartCol: slabStart,
        slabEndCol: slabEnd,
        colStart: cs,
        colEnd: ce,
        baseColStart: b.colStart,
        baseColEnd: b.colEnd,
        progress: pressT,
        pressDirection: pressDir,
      },
    };
  }

  function applyPlatformBlocks(perRow, rowIndex, blockCols, columns) {
    const pr = perRow[rowIndex];
    if (!pr) return;
    const blockSet = new Set([...pr.effectiveBlocks, ...blockCols]);
    pr.effectiveBlocks = Array.from(blockSet).sort((a, b) => a - b);
    pr.effectiveGaps = pr.effectiveGaps.filter((c) => !blockSet.has(c));
  }

  function compute(doc, elapsedSec) {
    const columns = doc.grid?.columns ?? 6;
    const flat = doc.flattened?.rows || [];
    const hazards = doc.hazards || [];
    const perRow = flat.map((row) => ({
      globalRowIndex: row.globalRowIndex,
      baseGaps: row.gaps.slice(),
      baseBlocks: row.blocks.slice(),
      effectiveGaps: row.gaps.slice(),
      effectiveBlocks: row.blocks.slice(),
      machinery: [],
    }));

    const hazardDraws = [];

    for (const hz of hazards) {
      const b = hz.bounds || {
        rowStart: hz.anchor?.globalRowIndex ?? 0,
        rowEnd: (hz.anchor?.globalRowIndex ?? 0) + (hz.params?.rowSpan ?? 1) - 1,
      };
      const anchorRow = b.rowStart;
      const kind = hz.kind;
      const span = b.rowEnd - b.rowStart + 1;

      if (kind === "hazard_platform") {
        const local = hazardAnimLocalSec(doc, hz, elapsedSec);
        for (let r = b.rowStart; r <= b.rowEnd && r < perRow.length; r++) {
          const sim = simPlatform(hz, columns, local, r);
          if (!sim) continue;
          applyPlatformBlocks(perRow, r, sim.blockCols, columns);
          perRow[r].machinery.push({ hazardId: hz.id, ...sim.draw });
          hazardDraws.push({ hazardId: hz.id, globalRowIndex: r, ...sim.draw });
        }
        continue;
      }

      if (kind === "hazard_vise" || kind === "pattern_sliding_gap") {
        for (let r = anchorRow; r < anchorRow + span && r < perRow.length; r++) {
          const local = hazardAnimLocalSec(doc, hz, elapsedSec);
          const sim =
            kind === "hazard_vise"
              ? simVise(hz, columns, local, r, doc)
              : simSlidingGap(hz, columns, r, doc);
          if (!sim) continue;
          const pr = perRow[r];
          if (sim.gaps) {
            pr.effectiveGaps = sim.gaps;
            pr.effectiveBlocks = sim.blocks;
          }
          if (sim.draw) {
            pr.machinery.push({ hazardId: hz.id, ...sim.draw });
            hazardDraws.push({ hazardId: hz.id, globalRowIndex: r, ...sim.draw });
          }
        }
        continue;
      }

      if (kind === "hazard_piston") {
        const local = hazardAnimLocalSec(doc, hz, elapsedSec);
        const sim = simPiston(hz, columns, local, doc);
        const mountRow = sim.draw.mountRow;
        if (perRow[mountRow]) {
          perRow[mountRow].machinery.push({ hazardId: hz.id, ...sim.draw });
        }
        hazardDraws.push({ hazardId: hz.id, globalRowIndex: mountRow, ...sim.draw });
        continue;
      }

      const local = hazardAnimLocalSec(doc, hz, elapsedSec);
      let sim = null;
      if (kind === "hazard_iris_clamp") sim = simIris(hz, columns, local);
      else if (kind === "hazard_tilt_gate") sim = simTilt(hz, columns, local);
      else if (kind === "hazard_buzz_wheel") sim = simBuzz(hz, columns, local, elapsedSec, doc);

      if (!sim) continue;
      if (sim.gaps && perRow[anchorRow]) {
        perRow[anchorRow].effectiveGaps = sim.gaps;
        perRow[anchorRow].effectiveBlocks = sim.blocks;
      }
      if (sim.draw) {
        if (perRow[anchorRow]) perRow[anchorRow].machinery.push({ hazardId: hz.id, ...sim.draw });
        hazardDraws.push({ hazardId: hz.id, globalRowIndex: anchorRow, ...sim.draw });
      }

      const telegraphRows = hz.params?.telegraphRows ?? 0;
      for (let t = 1; t <= telegraphRows; t++) {
        const tr = anchorRow - t;
        if (tr >= 0 && perRow[tr] && kind === "hazard_iris_clamp") {
          perRow[tr].machinery.push({ hazardId: hz.id, kind: "telegraph", targetRow: anchorRow });
        }
      }
    }

    return {
      elapsedSec,
      perRow,
      hazardDraws,
      rowEnterSec: (r) => rowEnterSec(doc, r),
      rowLocalSec: (r) => rowLocalSec(doc, r, elapsedSec),
      hazardAnimStartSec: (hz) => hazardAnimStartSec(doc, hz),
      hazardAnimLocalSec: (hz) => hazardAnimLocalSec(doc, hz, elapsedSec),
    };
  }

  function effectiveGapsAt(doc, elapsedSec, globalRowIndex) {
    const sim = compute(doc, elapsedSec);
    const row = sim.perRow[globalRowIndex];
    return row ? row.effectiveGaps : doc.flattened?.rows?.[globalRowIndex]?.gaps || [];
  }

  global.StageDesignHazardSim = {
    rowEnterSec,
    rowLocalSec,
    waterPosition,
    usesAnimStartTime,
    hazardAnimStartRow,
    hazardAnimStartThreshold,
    hazardAnimStartSec,
    hazardAnimLocalSec,
    hazardAnimWaiting,
    applyPressEase,
    PRESS_EASE,
    compute,
    effectiveGapsAt,
    trackColumnAt,
  };
})(typeof window !== "undefined" ? window : globalThis);
