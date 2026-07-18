/**
 * Fairness linter v2 — SH-005 with timed hazard sampling.
 */
(function (global) {
  "use strict";

  const S = () => global.StageDesignSchema;
  const Sim = () => global.StageDesignHazardSim;
  const G = () => global.StageDesignHazardGenerators;

  const MIN_RESIDUAL_HINT =
    "check pressCols cap (min residual gap = 1 col on 6-col grid; see platform-shaft-roadmap PS-003)";

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

  function gapWidthFromRow(flatRow) {
    return Array.isArray(flatRow?.gaps) ? flatRow.gaps.length : 0;
  }

  function auditPlatformPressCaps(doc, warnings) {
    const columns = doc.grid?.columns ?? 6;
    const flat = doc.flattened?.rows || [];
    const hazards = doc.hazards || [];
    const minRes = G()?.MIN_RESIDUAL_GAP_COLS_DEFAULT ?? 1;
    const maxPress = G()?.maxPressColsForCorridor;

    if (!maxPress) return;

    for (const hz of hazards) {
      if (hz.kind !== "hazard_platform") continue;
      const rs = hz.bounds?.rowStart ?? hz.anchor?.globalRowIndex ?? 0;
      const row = flat[rs];
      if (!row) continue;
      const gapW = gapWidthFromRow(row);
      const requested = hz.params?.pressCols ?? 1;
      const allowed = maxPress(gapW, 0, minRes);
      if (requested > allowed) {
        warnings.push(
          `Platform ${hz.id}: pressCols=${requested} exceeds cap ${allowed} for gap width ${gapW} — ${MIN_RESIDUAL_HINT}.`
        );
      }
    }
  }

  /**
   * Piston fairness — mirrors compose contract in composePistonShaft.ts:
   * inner columns only, adjacent escape column open across the swept rows.
   */
  function auditPistons(doc, warnings) {
    const columns = doc.grid?.columns ?? 6;
    const flat = doc.flattened?.rows || [];
    for (const hz of doc.hazards || []) {
      if (hz.kind !== "hazard_piston") continue;
      const b = hz.bounds || {};
      const col = b.colStart ?? 0;
      if (col <= 0 || col >= columns - 1) {
        warnings.push(
          `Piston ${hz.id}: column ${col} touches a wall — live game allows inner columns only (1–${columns - 2}).`
        );
      }
      const sweptStart = Math.max(0, b.rowStart ?? 0);
      const sweptEnd = Math.min(flat.length - 1, b.rowEnd ?? sweptStart);
      for (let r = sweptStart; r <= sweptEnd; r++) {
        const gaps = new Set(flat[r]?.gaps || []);
        const leftOpen = col - 1 >= 0 && gaps.has(col - 1);
        const rightOpen = col + 1 < columns && gaps.has(col + 1);
        if (!leftOpen && !rightOpen) {
          warnings.push(
            `Piston ${hz.id}: row ${r} has no open escape column beside col ${col} — player cannot dodge the head.`
          );
          break;
        }
      }
    }
  }

  function computeFairnessReport(doc) {
    const warnings = [];
    const issues = [];
    const columns = doc.grid?.columns ?? 6;
    const flat = doc.flattened?.rows || [];
    const rowHeight = doc.playback?.rowHeightPx || 24;
    const speed = doc.playback?.waterSpeedPxPerSec || 350;
    const hasPlatform = (doc.hazards || []).some((h) => h.kind === "hazard_platform");

    if (Array.isArray(doc.meta?.harmonizerWarnings)) {
      warnings.push(...doc.meta.harmonizerWarnings);
    }

    auditPlatformPressCaps(doc, warnings);
    auditPistons(doc, warnings);

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
        let msg = `Timed: row ${i} unreachable at t=${worst.t.toFixed(2)}s (overlap=${worst.overlap}).`;
        if (hasPlatform) {
          msg += ` — ${MIN_RESIDUAL_HINT}.`;
        }
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
