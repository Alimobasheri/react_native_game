/**
 * Fairness linter v2 — SH-005 with timed hazard sampling.
 */
(function (global) {
  "use strict";

  const S = () => global.StageDesignSchema;
  const Sim = () => global.StageDesignHazardSim;

  function groupGapsToRanges(gaps, rowLength) {
    return S().groupGapsToRanges(gaps, rowLength);
  }

  function overlapBetweenRows(gapsA, gapsB, columns) {
    const prev = groupGapsToRanges(gapsA, columns);
    const curr = groupGapsToRanges(gapsB, columns);
    if (!prev.length || !curr.length) return 0;
    let maxOv = 0;
    for (let a = 0; a < curr.length; a++) {
      for (let b = 0; b < prev.length; b++) {
        maxOv = Math.max(maxOv, S().overlapCols(curr[a], prev[b]));
      }
    }
    return maxOv;
  }

  function computeFairnessReport(doc) {
    const warnings = [];
    const issues = [];
    const columns = doc.grid?.columns ?? 6;
    const flat = doc.flattened?.rows || [];
    const rowHeight = doc.playback?.rowHeightPx || 24;
    const speed = doc.playback?.waterSpeedPxPerSec || 350;

    for (let i = 1; i < flat.length; i++) {
      const ov = overlapBetweenRows(flat[i - 1].gaps, flat[i].gaps, columns);
      if (ov < 1) {
        warnings.push(`Static: no gap overlap row ${i - 1}→${i} (SH-005).`);
        issues.push({ type: "static", row: i, overlap: ov });
      }
    }

    if (!Sim()?.compute) {
      return { ok: issues.length === 0, warnings, issues, sampled: 0 };
    }

    const samples = 12;
    const totalRows = flat.length;
    const maxSec = totalRows > 0 ? (totalRows * rowHeight) / speed : 0;

    for (let i = 1; i < flat.length; i++) {
      const rowEnter = Sim().rowEnterSec(doc, i);
      const windowStart = Math.max(0, rowEnter - 0.5);
      const windowEnd = rowEnter + rowHeight / speed;
      let worst = { overlap: Infinity, t: 0 };

      for (let s = 0; s <= samples; s++) {
        const t = windowStart + ((windowEnd - windowStart) * s) / samples;
        if (t > maxSec) break;
        const eff = Sim().effectiveGapsAt(doc, t, i);
        const ov = overlapBetweenRows(flat[i - 1].gaps, eff, columns);
        if (ov < worst.overlap) worst = { overlap: ov, t };
      }

      if (worst.overlap < 1) {
        const msg = `Timed: row ${i} unreachable at t=${worst.t.toFixed(2)}s (overlap=${worst.overlap}).`;
        warnings.push(msg);
        issues.push({ type: "timed", row: i, t: worst.t, overlap: worst.overlap });
      }
    }

    return {
      ok: issues.length === 0,
      warnings,
      issues,
      sampled: samples,
    };
  }

  function attachFairnessReport(doc) {
    const report = computeFairnessReport(doc);
    doc.fairnessReport = report;
    return report;
  }

  global.StageDesignFairness = {
    computeFairnessReport,
    attachFairnessReport,
    overlapBetweenRows,
  };
})(typeof window !== "undefined" ? window : globalThis);
