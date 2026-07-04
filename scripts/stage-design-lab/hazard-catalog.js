/**
 * Hazard catalog — player-facing names, descriptions, default bounds, templates.
 */
(function (global) {
  "use strict";

  const CATALOG = [
    {
      kind: "hazard_platform",
      playerFlash: "",
      templateName: "Steel platform",
      description:
        "One metal slab — drag the exact rectangle you want. One platform per drag. Set press direction and distance in Selection.",
      wizardFn: null,
      defaultRows: 1,
      defaultCols: 2,
      icon: "platform",
      params: { pressCols: 1, pressDurationSec: 0.8, pressDirection: "right", pressEase: "ease-out" },
    },
    {
      kind: "hazard_iris_clamp",
      playerFlash: "Clamp!",
      templateName: "Iris clamp (pair)",
      description: "Two pans in the rectangle you drag — use only if you want a paired clamp.",
      wizardFn: "irisClampRow",
      defaultRows: 1,
      defaultCols: 2,
      icon: "iris",
      params: { preset: "2of8", closeDurationSec: 0.9, telegraphRows: 2 },
    },
    {
      kind: "hazard_tilt_gate",
      playerFlash: "Drop!",
      templateName: "Drawbridge flap",
      description: "Hinged flap within your selected rectangle only.",
      wizardFn: "tiltGate",
      defaultRows: 1,
      defaultCols: 2,
      icon: "tilt",
      params: { side: "left", closeDurationSec: 0.7 },
    },
    {
      kind: "hazard_buzz_wheel",
      playerFlash: "Buzz!",
      templateName: "Drift saw",
      description: "Spinning disc in the cell(s) you select.",
      wizardFn: "buzzWheel",
      defaultRows: 1,
      defaultCols: 1,
      icon: "buzz",
      params: { mode: "drift", spinRpm: 120 },
    },
    {
      kind: "pattern_sliding_gap",
      playerFlash: "",
      templateName: "Drifting lane",
      description: "Gap center moves across the rows you select (exact bounds).",
      wizardFn: "slidingGap",
      defaultRows: 4,
      defaultCols: 2,
      icon: "slide",
      params: { rowSpan: 4 },
    },
  ];

  function getByKind(kind) {
    return CATALOG.find((c) => c.kind === kind) || null;
  }

  function getAll() {
    return CATALOG.slice();
  }

  function defaultBounds(kind, columns, anchorRow) {
    const cat = getByKind(kind);
    const row = Math.max(0, anchorRow ?? 0);
    if (!cat) {
      return { rowStart: row, rowEnd: row, colStart: 0, colEnd: Math.min(1, columns - 1) };
    }
    const rowEnd = row + Math.max(0, (cat.defaultRows || 1) - 1);
    let colStart = 0;
    let colEnd = Math.min(columns - 1, (cat.defaultCols === "full" ? columns - 1 : Number(cat.defaultCols) || 2) - 1);
    if (cat.defaultCols === 1) {
      const c = Math.floor(columns / 2);
      colStart = c;
      colEnd = c;
    } else if (typeof cat.defaultCols === "number") {
      colEnd = Math.min(columns - 1, colStart + cat.defaultCols - 1);
    }
    return { rowStart: row, rowEnd, colStart, colEnd };
  }

  function boundsLabel(bounds) {
    if (!bounds) return "";
    const sameRow = bounds.rowStart === bounds.rowEnd;
    const sameCol = bounds.colStart === bounds.colEnd;
    if (sameRow && sameCol) {
      return `row ${bounds.rowStart}, col ${bounds.colStart}`;
    }
    if (sameRow) {
      return `row ${bounds.rowStart}, cols ${bounds.colStart}–${bounds.colEnd}`;
    }
    return `rows ${bounds.rowStart}–${bounds.rowEnd}, cols ${bounds.colStart}–${bounds.colEnd}`;
  }

  function inferPressDirection(bounds, columns) {
    const center = (bounds.colStart + bounds.colEnd) / 2;
    const mid = (columns - 1) / 2;
    return center <= mid ? "right" : "left";
  }

  global.StageDesignHazardCatalog = {
    CATALOG,
    getByKind,
    getAll,
    defaultBounds,
    boundsLabel,
    inferPressDirection,
  };
})(typeof window !== "undefined" ? window : globalThis);
