/**
 * Export — JSON, PNG screenshots, agent handoff bundle.
 */
(function (global) {
  "use strict";

  const S = () => global.StageDesignSchema;

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function downloadText(text, filename, mime) {
    downloadBlob(new Blob([text], { type: mime || "text/plain" }), filename);
  }

  function downloadJson(doc, filename) {
    const json = S().exportDocumentJson(doc, true);
    downloadText(json, filename || `${S().slugifyStageName(doc.stage?.displayName)}.json`, "application/json");
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed."));
      }, "image/png");
    });
  }

  async function downloadCanvasPng(canvas, filename) {
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob, filename || "stage-design.png");
  }

  async function copyCanvasPng(canvas) {
    if (!navigator.clipboard?.write) {
      throw new Error("Clipboard API not available in this browser.");
    }
    const blob = await canvasToBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }

  function captureViewportPng(canvas, canvasWrap) {
    return new Promise((resolve, reject) => {
      const dpr = window.devicePixelRatio || 1;
      const scrollLeft = canvasWrap.scrollLeft;
      const scrollTop = canvasWrap.scrollTop;
      const vw = canvasWrap.clientWidth;
      const vh = canvasWrap.clientHeight;
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.floor(vw * dpr));
      off.height = Math.max(1, Math.floor(vh * dpr));
      const ctx = off.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(
        canvas,
        scrollLeft * dpr,
        scrollTop * dpr,
        vw * dpr,
        vh * dpr,
        0,
        0,
        vw,
        vh
      );
      off.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Viewport capture failed."));
      }, "image/png");
    });
  }

  async function downloadViewportPng(canvas, canvasWrap, filename) {
    const blob = await captureViewportPng(canvas, canvasWrap);
    downloadBlob(blob, filename || "stage-design-viewport.png");
  }

  function buildAgentPrompt(doc) {
    const stage = doc.stage || {};
    const hazard = stage.signatureHazardId || "none";
    const rows = doc.flattened?.totalRows ?? 0;
    const cols = doc.grid?.columns ?? 6;
    const segments = (doc.segments || [])
      .map((s) => `${s.macroPhase}:${s.label}(${s.rows.length}r)`)
      .join(", ");
    const hzSummary = S().summarizeHazards?.(doc) || "none";
    const tracks = (doc.tracks || []).length
      ? (doc.tracks || []).map((t) => t.label || t.id).join(", ")
      : "none";
    const fair = doc.fairnessReport || global.StageDesignFairness?.computeFairnessReport?.(doc);
    const fairLine = fair?.ok
      ? "OK"
      : fair?.warnings?.[0] || "issues detected";
    return [
      `Stage design handoff — ${stage.displayName || "Untitled"} (Stage ${stage.index || 1})`,
      `Grid: ${cols} columns, ${rows} rows, signature: ${hazard}`,
      `Hazards: ${hzSummary || "none"}`,
      `Tracks: ${tracks}`,
      `Fairness: ${fairLine}`,
      `Segments: ${segments || "none"}`,
      "See attached JSON (schema v2: hazards[], tracks[], markers[], fairnessReport) + PNG screenshot.",
      `Goal: implement/tune per stage-hazard-progression-roadmap (signature: ${hazard}).`,
      doc.meta?.notes ? `Notes: ${doc.meta.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function exportHandoffBundle(doc, canvas, canvasWrap) {
    const slug = S().slugifyStageName(doc.stage?.displayName);
    const copy = JSON.parse(JSON.stringify(doc));
    if (global.StageDesignFairness?.attachFairnessReport) {
      global.StageDesignFairness.attachFairnessReport(copy);
    }
    downloadText(S().exportDocumentJson(copy, true), `${slug}.json`, "application/json");
    await downloadCanvasPng(canvas, `${slug}.png`);
    downloadText(buildAgentPrompt(copy), `${slug}-prompt.txt`);
  }

  async function copyJsonForAgent(doc) {
    const text = S().exportDocumentJson(doc, true);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return text;
    }
    throw new Error("Clipboard write not available.");
  }

  global.StageDesignExport = {
    downloadBlob,
    downloadText,
    downloadJson,
    downloadCanvasPng,
    copyCanvasPng,
    downloadViewportPng,
    captureViewportPng,
    buildAgentPrompt,
    exportHandoffBundle,
    copyJsonForAgent,
  };
})(typeof window !== "undefined" ? window : globalThis);
