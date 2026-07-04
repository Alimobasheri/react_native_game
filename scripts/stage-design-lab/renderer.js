/**
 * Canvas renderer — blocks, gaps, phase bands, water line, selection.
 */
(function (global) {
  "use strict";

  const S = () => global.StageDesignSchema;
  const HR = () => global.StageDesignHazardRenderer;

  function resizeCanvasToCssPixels(canvas, ctx, cssWidth, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.ceil(cssWidth));
    const height = Math.max(1, Math.ceil(cssHeight));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawGreenCoin(ctx, centerX, centerY, radius, tMs, phaseOffset) {
    const flip = tMs * 0.0032 + phaseOffset;
    const scaleX = Math.max(0.14, Math.abs(Math.cos(flip)));
    const t = tMs * 0.001;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scaleX, 1);
    const glowPulse = 0.45 + 0.55 * Math.sin(t * 2.1 + phaseOffset);
    const g1 = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius * 1.45);
    g1.addColorStop(0, `rgba(120, 255, 170, ${0.28 * glowPulse})`);
    g1.addColorStop(0.45, `rgba(60, 200, 110, ${0.16 * glowPulse})`);
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.38, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, 0, 0, 0, radius);
    body.addColorStop(0, "#ecfdf5");
    body.addColorStop(0.25, "#86efac");
    body.addColorStop(0.55, "#22c55e");
    body.addColorStop(0.88, "#15803d");
    body.addColorStop(1, "#14532d");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderStageCanvas(canvas, level, opts) {
    const ctx = canvas.getContext("2d");
    const columns = Math.max(1, Number(level?.columns ?? 0) || 0);
    const rows = Array.isArray(level?.rows) ? level.rows : [];
    const rowCount = rows.length;
    if (!columns || !rowCount) {
      return drawEmpty(canvas, ctx, opts, "No rows to render.");
    }

    const cell = opts.cell;
    const gap = opts.gap;
    const pad = opts.pad;
    const axisPadLeft = opts.axisPadLeft;
    const axisPadTop = opts.axisPadTop;
    const showGaps = Boolean(opts.showGaps);
    const showCoins = Boolean(opts.showCoins);
    const animTime = opts.animTime != null ? opts.animTime : performance.now();
    const activeRow = Number.isFinite(opts.activeRow) ? opts.activeRow : -1;
    const selectedRows = new Set(opts.selectedRows || []);
    const waterRowIndex = Number.isFinite(opts.waterRowIndex) ? opts.waterRowIndex : null;
    const canvasWrap = opts.canvasWrap;
    const hazardSim = opts.hazardSim || null;
    const markers = opts.markers || [];
    const animateHazards = opts.animateHazards !== false;
    const showMarkers = opts.showMarkers !== false;
    const showDeviceFrame = Boolean(opts.showDeviceFrame);

    const gridW = columns * cell + (columns - 1) * gap;
    const gridH = rowCount * cell + (rowCount - 1) * gap;
    const viewportW = Math.max(1, canvasWrap?.clientWidth || 420);
    const viewportH = Math.max(1, canvasWrap?.clientHeight || 400);
    const contentW = Math.max(viewportW, gridW + pad * 2 + axisPadLeft);
    const contentH = Math.max(viewportH, gridH + pad * 2 + axisPadTop);
    const scale = 1;

    resizeCanvasToCssPixels(canvas, ctx, contentW, contentH);
    const cssW = contentW;
    const cssH = contentH;

    const canvasBg = getComputedStyle(document.documentElement)
      .getPropertyValue("--canvas-bg")
      .trim();
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, cssW, cssH);

    const startX = Math.floor((cssW - axisPadLeft - gridW) / 2) + axisPadLeft;
    const startY = cssH - pad - gridH;

    const lastView = {
      startX,
      startY,
      scale,
      cell,
      gap,
      pad,
      columns,
      rowCount,
      axisPadLeft,
      axisPadTop,
      contentW,
      contentH,
    };

    // Phase band stripe (left)
    ctx.save();
    ctx.translate(startX - 8, startY);
    for (let r = 0; r < rowCount; r++) {
      const rr = rowCount - 1 - r;
      const rowDef = rows[r] || {};
      const phase = rowDef.macroPhase || "flow";
      const color = S().PHASE_COLORS[phase] || S().PHASE_COLORS.flow;
      const y = rr * (cell + gap);
      ctx.fillStyle = color;
      ctx.fillRect(-4, y, 3, cell);
    }
    ctx.restore();

    // Axis labels
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font =
      "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let c = 0; c < columns; c++) {
      const x = startX + (c * (cell + gap) + cell / 2) * scale;
      const y = startY - Math.max(10, axisPadTop * 0.55);
      ctx.fillText(String(c), x, y);
    }
    ctx.textAlign = "right";
    for (let r = 0; r < rowCount; r++) {
      const rr = rowCount - 1 - r;
      const y = startY + (rr * (cell + gap) + cell / 2) * scale;
      const x = startX - Math.max(10, axisPadLeft * 0.28);
      const isSel = selectedRows.has(r);
      if (isSel) {
        ctx.fillStyle = "rgba(255, 200, 100, 0.95)";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.72)";
      }
      ctx.fillText(String(r), x, y);
    }
    ctx.restore();

    // Grid backdrop
    ctx.save();
    ctx.translate(startX, startY);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let r = 0; r < rowCount; r++) {
      const rr = rowCount - 1 - r;
      for (let c = 0; c < columns; c++) {
        const x = c * (cell + gap);
        const y = rr * (cell + gap);
        ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.restore();

    // Water fill from bottom
    if (waterRowIndex != null && waterRowIndex >= 0) {
      const frac = waterRowIndex - Math.floor(waterRowIndex);
      const baseRow = Math.floor(waterRowIndex);
      const rrBase = rowCount - 1 - baseRow;
      const waterTop =
        startY +
        (rrBase + 1) * (cell + gap) * scale -
        frac * (cell + gap) * scale -
        gap * scale;
      ctx.save();
      ctx.fillStyle = "rgba(56, 189, 248, 0.28)";
      ctx.fillRect(startX - 6, waterTop, gridW * scale + 12, cssH - waterTop);
      ctx.strokeStyle = "rgba(125, 211, 252, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX - 6, waterTop);
      ctx.lineTo(startX + gridW * scale + 6, waterTop);
      ctx.stroke();
      ctx.restore();
    }

    // Active / selected row highlights
    for (let r = 0; r < rowCount; r++) {
      const rr = rowCount - 1 - r;
      const y = rr * (cell + gap);
      const isActive = r === activeRow;
      const isSelected = selectedRows.has(r);
      if (!isActive && !isSelected) continue;
      ctx.save();
      ctx.translate(startX, startY);
      ctx.scale(scale, scale);
      if (isSelected) {
        ctx.fillStyle = "rgba(255, 154, 60, 0.12)";
        ctx.fillRect(-4, y - 2, gridW + 8, cell + 4);
        ctx.strokeStyle = "rgba(255, 154, 60, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-4, y - 2, gridW + 8, cell + 4);
      }
      if (isActive) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
        ctx.fillRect(-4, y - 4, gridW + 8, cell + 8);
        ctx.strokeStyle = "rgba(255, 244, 156, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-4, y - 4, gridW + 8, cell + 8);
        ctx.fillStyle = "rgba(255,244,156,0.95)";
        ctx.font =
          "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(`water @ row ${r}`, 0, Math.max(12, y - 7));
      }
      ctx.restore();
    }

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const gapColor = "rgba(61, 209, 255, 0.22)";
    const gapStroke = "rgba(61, 209, 255, 0.62)";

    ctx.save();
    ctx.translate(startX, startY);
    ctx.scale(scale, scale);

    let totalBlocks = 0;
    for (let r = 0; r < rowCount; r++) {
      const rr = rowCount - 1 - r;
      const rowDef = rows[r] || {};
      const rowSim = hazardSim?.perRow?.[r];
      const blocks = S().normalizeUniqueInts(
        rowSim?.effectiveBlocks ?? rowDef.blocks,
        0,
        columns - 1
      );
      const gapsArr = S().normalizeUniqueInts(
        rowSim?.effectiveGaps ?? rowDef.gaps,
        0,
        columns - 1
      );
      const conflictsArr = showCoins
        ? S().normalizeUniqueInts(rowDef.__conflicts, 0, columns - 1)
        : [];
      totalBlocks += blocks.length;

      if (showGaps && gapsArr.length) {
        for (let i = 0; i < gapsArr.length; i++) {
          const col = gapsArr[i];
          const x = col * (cell + gap);
          const y = rr * (cell + gap);
          ctx.fillStyle = gapColor;
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = gapStroke;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, cell - 1), Math.max(0, cell - 1));
        }
      }

      if (showCoins && conflictsArr.length) {
        for (let i = 0; i < conflictsArr.length; i++) {
          const col = conflictsArr[i];
          const x = col * (cell + gap);
          const y = rr * (cell + gap);
          drawGreenCoin(ctx, x + cell / 2, y + cell / 2, Math.max(3, cell * 0.42), animTime, col * 0.73 + rr * 1.17);
        }
      }

      for (let i = 0; i < blocks.length; i++) {
        const col = blocks[i];
        const x = col * (cell + gap);
        const y = rr * (cell + gap);
        ctx.fillStyle = accent;
        ctx.fillRect(x, y, cell, cell);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x + 2, y + 2, Math.max(0, cell - 4), Math.max(0, cell - 4));
      }
    }
    ctx.restore();

    if (HR()?.drawAllMachinery) {
      const hazardRegions = (opts.hazards || []).map((hz) => {
        const cat = global.StageDesignHazardCatalog?.getByKind?.(hz.kind);
        return {
          kind: hz.kind,
          bounds: hz.bounds || global.StageDesignSchema?.getHazardBounds?.(hz),
          label: cat?.templateName,
        };
      });
      HR().drawAllMachinery(ctx, hazardSim, level, cell, gap, rowCount, columns, {
        animateHazards,
        showLabels: opts.showLabels !== false,
        hazardRegions,
        startX,
        startY,
        scale,
        animTimeMs: animTime,
        playbackElapsedSec: hazardSim?.elapsedSec ?? opts.playbackElapsedSec,
        playing: opts.playing,
      });
    }
    if (HR()?.drawMarkers) {
      ctx.save();
      ctx.translate(startX, startY);
      ctx.scale(scale, scale);
      HR().drawMarkers(ctx, markers, cell, gap, rowCount, columns, showMarkers);
      ctx.restore();
    }
    if (HR()?.drawDeviceFrame) {
      HR().drawDeviceFrame(ctx, cssW, cssH, cell, showDeviceFrame);
    }
    if (HR()?.drawLegend) {
      HR().drawLegend(ctx, cssW, cssH, opts.showLegend !== false);
    }

    drawEditorOverlays(ctx, lastView, {
      cell,
      gap,
      rowCount,
      columns,
      hoverCell: opts.hoverCell,
      dragRect: opts.dragRect,
      selectedBounds: opts.selectedBounds,
    });

    return {
      lastView,
      stats: { columns, rowCount, totalBlocks, activeRow },
    };
  }

  function drawEditorOverlays(ctx, lastView, o) {
    if (!lastView) return;
    const { startX, startY, scale, cell, gap, rowCount, columns } = lastView;
    const stride = cell + gap;

    function boundsToPx(b) {
      const rrTop = rowCount - 1 - b.rowEnd;
      const rrBottom = rowCount - 1 - b.rowStart;
      const x = startX + b.colStart * stride * scale;
      const y = startY + rrTop * stride * scale;
      const w = (b.colEnd - b.colStart + 1) * stride * scale - gap * scale;
      const h = (rrBottom - rrTop + 1) * stride * scale - gap * scale;
      return { x, y, w, h };
    }

    ctx.save();

    if (o.hoverCell) {
      const rr = rowCount - 1 - o.hoverCell.globalRowIndex;
      const x = startX + o.hoverCell.col * stride * scale;
      const y = startY + rr * stride * scale;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cell * scale - 1, cell * scale - 1);
    }

    const drawRect = (b, stroke, fill, dash) => {
      const { x, y, w, h } = boundsToPx(b);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash || []);
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.setLineDash([]);
      const handles = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ];
      handles.forEach(([hx, hy]) => {
        ctx.fillStyle = stroke;
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
      });
    };

    if (o.dragRect) {
      drawRect(o.dragRect, "rgba(168, 85, 247, 0.85)", "rgba(168, 85, 247, 0.15)", [6, 4]);
    }
    if (o.selectedBounds) {
      drawRect(o.selectedBounds, "rgba(168, 85, 247, 0.95)", null, []);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "left";
      const { x, y } = boundsToPx(o.selectedBounds);
      ctx.fillText(
        `R${o.selectedBounds.rowStart}–${o.selectedBounds.rowEnd} C${o.selectedBounds.colStart}–${o.selectedBounds.colEnd}`,
        x + 4,
        y - 4
      );
    }

    ctx.restore();
  }

  function drawEmpty(canvas, ctx, opts, message) {
    const canvasWrap = opts?.canvasWrap;
    const cssW = Math.max(1, canvasWrap?.clientWidth || 420);
    const cssH = Math.max(1, canvasWrap?.clientHeight || 400);
    resizeCanvasToCssPixels(canvas, ctx, cssW, cssH);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--canvas-bg")
      .trim();
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, cssW / 2, cssH / 2);
    return { lastView: null, stats: null };
  }

  function hitTestCell(lastView, cssX, cssY) {
    if (!lastView) return null;
    const { startX, startY, scale, cell, gap, columns, rowCount } = lastView;
    const x = (cssX - startX) / scale;
    const y = (cssY - startY) / scale;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return null;
    const stride = cell + gap;
    const col = Math.floor(x / stride);
    const rowFromTop = Math.floor(y / stride);
    if (col < 0 || col >= columns || rowFromTop < 0 || rowFromTop >= rowCount) return null;
    const inCellX = x - col * stride;
    const inCellY = y - rowFromTop * stride;
    if (inCellX < 0 || inCellX > cell || inCellY < 0 || inCellY > cell) return null;
    const jsonRow = rowCount - 1 - rowFromTop;
    return { col, globalRowIndex: jsonRow };
  }

  function scrollCanvasToBottom(canvasWrap) {
    canvasWrap.scrollTop = Math.max(0, canvasWrap.scrollHeight - canvasWrap.clientHeight);
  }

  function scrollCanvasToRow(canvasWrap, lastView, rowIndex, behavior) {
    if (!lastView || rowIndex < 0 || rowIndex >= lastView.rowCount) return;
    const { startY, cell, gap, rowCount } = lastView;
    const rowFromTop = rowCount - 1 - rowIndex;
    const rowTop = startY + rowFromTop * (cell + gap);
    const rowMid = rowTop + cell / 2;
    const targetTop = Math.max(
      0,
      Math.min(
        rowMid - canvasWrap.clientHeight * 0.55,
        Math.max(0, canvasWrap.scrollHeight - canvasWrap.clientHeight)
      )
    );
    canvasWrap.scrollTo({ top: targetTop, behavior: behavior || "auto" });
  }

  global.StageDesignRenderer = {
    renderStageCanvas,
    hitTestCell,
    scrollCanvasToBottom,
    scrollCanvasToRow,
    resizeCanvasToCssPixels,
  };
})(typeof window !== "undefined" ? window : globalThis);
