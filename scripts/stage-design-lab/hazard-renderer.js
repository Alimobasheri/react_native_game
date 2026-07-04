/**
 * Machinery + marker canvas drawing (steel palette, SH-011) — visual literacy pass.
 */
(function (global) {
  "use strict";

  const Cat = () => global.StageDesignHazardCatalog;

  const STEEL = {
    fill: "#64748b",
    dark: "#334155",
    edge: "#94a3b8",
    light: "#cbd5e1",
    telegraph: "#fbbf24",
    buzz: "#475569",
    buzzEdge: "#ef4444",
    region: "rgba(168, 85, 247, 0.12)",
    regionBorder: "rgba(168, 85, 247, 0.55)",
  };

  function drawBolt(ctx, x, y) {
    ctx.fillStyle = STEEL.light;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function resolveBuzzSpinAngle(draw, opts) {
    const rpm = draw.spinRpm ?? 120;
    const pb = opts?.playbackElapsedSec;
    const playing = opts?.playing;
    const sec = pb != null && (playing || pb > 0) ? pb : (opts?.animTimeMs ?? performance.now()) / 1000;
    return ((sec * rpm * 360) / 60) % 360;
  }

  function drawMachinery(ctx, draw, cell, gap, rowFromTop, columns, showLabels, spinOpts) {
    const stride = cell + gap;
    const y = rowFromTop * stride;

    if (draw.kind === "hazard_platform") {
      const slabStart = draw.slabStartCol ?? draw.colStart ?? draw.baseColStart ?? 0;
      const slabEnd = draw.slabEndCol ?? (draw.colEnd != null ? draw.colEnd + 1 : slabStart + 1);
      const x = slabStart * stride + 1;
      const w = Math.max(0, (slabEnd - slabStart) * stride - gap - 2);
      ctx.fillStyle = STEEL.fill;
      ctx.fillRect(x, y + 2, w, cell - 4);
      ctx.strokeStyle = STEEL.telegraph;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(slabStart * stride + 0.5, y + 1, (slabEnd - slabStart) * stride - gap, cell - 2);
      if (draw.baseColStart != null && draw.progress > 0 && draw.progress < 1) {
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.strokeRect(
          draw.baseColStart * stride + 0.5,
          y + 1,
          (draw.baseColEnd - draw.baseColStart + 1) * stride - gap,
          cell - 2
        );
        ctx.setLineDash([]);
      }
      if (showLabels !== false) {
        ctx.fillStyle = STEEL.light;
        ctx.font = `bold ${Math.max(7, cell * 0.26)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        const cx = (slabStart + slabEnd) * 0.5 * stride;
        ctx.fillText("SLAB", cx, y + cell * 0.58);
      }
      return;
    }

    if (draw.kind === "hazard_iris_clamp") {
      const left = Math.max(0, Math.min(columns - 1, Math.round(draw.leftPanCol ?? 0)));
      const right = Math.max(0, Math.min(columns - 1, Math.round(draw.rightPanCol ?? columns - 1)));
      const panH = cell - 2;
      ctx.fillStyle = STEEL.fill;
      ctx.fillRect(0, y + 1, left * stride + cell, panH);
      ctx.fillRect(right * stride, y + 1, (columns - right) * stride, panH);
      ctx.strokeStyle = STEEL.telegraph;
      ctx.lineWidth = 2;
      ctx.strokeRect(0.5, y + 0.5, left * stride + cell - 1, panH);
      ctx.strokeRect(right * stride + 0.5, y + 0.5, (columns - right) * stride, panH);
      drawBolt(ctx, left * stride + cell * 0.75, y + cell * 0.35);
      drawBolt(ctx, right * stride + cell * 0.25, y + cell * 0.35);
      if (showLabels !== false) {
        ctx.fillStyle = STEEL.light;
        ctx.font = `bold ${Math.max(7, cell * 0.28)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("PAN", (left * stride + cell) / 2, y + cell * 0.55);
        ctx.fillText("PAN", right * stride + cell / 2, y + cell * 0.55);
      }
      if (draw.progress > 0 && draw.progress < 1) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
        const mid = (left + right) / 2;
        ctx.strokeRect(mid * stride, y + 2, cell, cell - 4);
        ctx.setLineDash([]);
      }
      return;
    }

    if (draw.kind === "hazard_vise") {
      const stride2 = stride;
      ctx.fillStyle = STEEL.dark;
      const leftCols = draw.leftJawCols || [];
      const rightCols = draw.rightJawCols || [];
      if (leftCols.length) {
        const x0 = leftCols[0] * stride2;
        const x1 = (leftCols[leftCols.length - 1] + 1) * stride2 - gap;
        ctx.fillRect(x0 + 1, y + 2, x1 - x0 - 2, cell - 4);
        ctx.strokeStyle = STEEL.edge;
        ctx.strokeRect(x0 + 1, y + 2, x1 - x0 - 2, cell - 4);
      }
      if (rightCols.length) {
        const x0 = rightCols[0] * stride2;
        const x1 = (rightCols[rightCols.length - 1] + 1) * stride2 - gap;
        ctx.fillRect(x0 + 1, y + 2, x1 - x0 - 2, cell - 4);
        ctx.strokeStyle = STEEL.edge;
        ctx.strokeRect(x0 + 1, y + 2, x1 - x0 - 2, cell - 4);
      }
      if (showLabels !== false && draw.step === 0) {
        ctx.fillStyle = STEEL.telegraph;
        ctx.font = `bold ${Math.max(8, cell * 0.32)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("Squeeze!", (columns * stride2) / 2, y + cell + 10);
      }
      return;
    }

    if (draw.kind === "hazard_tilt_gate") {
      const pivotCol = draw.pivotCol ?? 0;
      const px = pivotCol * stride + cell / 2;
      const py = y + cell;
      const angle = ((draw.angleDeg ?? 90) * Math.PI) / 180;
      const len = cell * 1.35;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-angle);
      ctx.fillStyle = STEEL.fill;
      ctx.fillRect(0, -5, len, 10);
      ctx.strokeStyle = STEEL.edge;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, -5, len, 10);
      drawBolt(ctx, 0, 0);
      ctx.restore();
      if (showLabels !== false && (draw.progress || 0) < 0.2) {
        ctx.fillStyle = STEEL.telegraph;
        ctx.font = `bold ${Math.max(8, cell * 0.3)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = draw.side === "left" ? "left" : "right";
        ctx.fillText("Drop!", draw.side === "left" ? 2 : columns * stride - 2, y + 10);
      }
      return;
    }

    if (draw.kind === "hazard_buzz_wheel") {
      const col = draw.column ?? columns / 2;
      const cx = col * stride + cell / 2;
      const cy = y + cell / 2;
      const r = cell * (draw.radiusFrac ?? 0.38);
      const spinDeg = resolveBuzzSpinAngle(draw, spinOpts);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((spinDeg * Math.PI) / 180);
      ctx.fillStyle = STEEL.buzz;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = STEEL.buzzEdge;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(r * 0.55, 0);
        ctx.lineTo(r * 1.15, 0);
        ctx.stroke();
        ctx.rotate(Math.PI / 4);
      }
      ctx.restore();
      if (showLabels !== false) {
        ctx.fillStyle = STEEL.buzzEdge;
        ctx.font = `bold ${Math.max(7, cell * 0.28)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("Buzz!", cx, y - 3);
      }
      return;
    }

    if (draw.kind === "telegraph") {
      ctx.fillStyle = "rgba(251, 191, 36, 0.22)";
      ctx.fillRect(0, y, columns * stride - gap, cell);
      if (showLabels !== false) {
        const flash = Cat()?.getByKind?.("hazard_iris_clamp")?.playerFlash || "Clamp!";
        ctx.fillStyle = STEEL.telegraph;
        ctx.font = `bold ${Math.max(9, cell * 0.38)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(flash, (columns * stride) / 2, y + cell * 0.65);
      }
    }
  }

  function drawRegionTint(ctx, bounds, cell, gap, rowCount, columns, label) {
    if (!bounds) return;
    const stride = cell + gap;
    const rrTop = rowCount - 1 - bounds.rowEnd;
    const rrBottom = rowCount - 1 - bounds.rowStart;
    const y = rrTop * stride;
    const h = (rrBottom - rrTop + 1) * stride - gap;
    const x = bounds.colStart * stride;
    const w = (bounds.colEnd - bounds.colStart + 1) * stride - gap;
    ctx.fillStyle = STEEL.region;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = STEEL.regionBorder;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.setLineDash([]);
    if (label) {
      ctx.fillStyle = STEEL.regionBorder;
      ctx.font = `bold ${Math.max(8, cell * 0.28)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(label, x + 3, y + Math.min(h - 4, cell * 0.5));
    }
  }

  function drawMarkers(ctx, markers, cell, gap, rowCount, columns, showMarkers) {
    if (!showMarkers || !markers?.length) return;
    const stride = cell + gap;
    markers.forEach((mk) => {
      const rr = rowCount - 1 - mk.globalRowIndex;
      if (rr < 0 || rr >= rowCount) return;
      const y = rr * stride;
      const colors = {
        telegraph: STEEL.telegraph,
        hazard_flash: "#f97316",
        tap_saved: "#22c55e",
        near_miss: "#a855f7",
        rest_preview: "#38bdf8",
        praise: "#fde047",
      };
      ctx.fillStyle = colors[mk.kind] || "#fff";
      ctx.font = `bold ${Math.max(8, cell * 0.32)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(mk.label || mk.kind, 2, y + cell - 2);
    });
  }

  function drawAllMachinery(ctx, sim, level, cell, gap, rowCount, columns, opts) {
    if (!sim || opts?.animateHazards === false) return;
    const startX = opts.startX ?? 0;
    const startY = opts.startY ?? 0;
    const scale = opts.scale ?? 1;
    const showLabels = opts.showLabels !== false;
    const hazardRegions = opts.hazardRegions || [];
    ctx.save();
    ctx.translate(startX, startY);
    ctx.scale(scale, scale);
    hazardRegions.forEach((hr) => {
      if (hr.bounds && hr.kind === "hazard_platform") {
        drawRegionTint(ctx, hr.bounds, cell, gap, rowCount, columns, null);
      }
    });
    for (let r = 0; r < (sim.perRow || []).length; r++) {
      const rowSim = sim.perRow[r];
      const rr = rowCount - 1 - r;
      (rowSim.machinery || []).forEach((draw) => drawMachinery(ctx, draw, cell, gap, rr, columns, showLabels, opts));
    }
    ctx.restore();
  }

  function drawLegend(ctx, cssW, cssH, enabled) {
    if (!enabled) return;
    const text = "■ orange clay  ■ steel machinery  ■ cyan gap  ■ blue water";
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(cssW - 290, cssH - 22, 286, 18);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(text, cssW - 286, cssH - 8);
    ctx.restore();
  }

  function drawDeviceFrame(ctx, cssW, cssH, cell, enabled) {
    if (!enabled) return;
    const phoneW = Math.min(cssW * 0.55, 390);
    const phoneH = cssH * 0.92;
    const x = (cssW - phoneW) / 2;
    const y = (cssH - phoneH) / 2;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, phoneW, phoneH);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Phone read check @ cell=${cell}px`, cssW / 2, y + 14);
    ctx.restore();
  }

  global.StageDesignHazardRenderer = {
    drawAllMachinery,
    drawMarkers,
    drawLegend,
    drawDeviceFrame,
    drawMachinery,
    drawRegionTint,
    STEEL,
  };
})(typeof window !== "undefined" ? window : globalThis);
