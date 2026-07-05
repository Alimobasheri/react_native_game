/**
 * Grid SSOT types for beat-row + column anchored hazards.
 *
 * Conventions:
 * - Columns are 0 .. columns-1 (see LAYOUT_CONSTANTS.COLUMNS).
 * - Beat rows are segment-local template rowIndex — NOT totalRowsGenerated.
 * - Fractional col extents (slabStart/slabEnd) drive steel render + effectivePressSlabAabb collision.
 * - Gap-column closure uses gapColsClosedByPressForCollision (not per-column snap on partial overlap).
 */

/** Segment-local beat row (template rowIndex). */
export type BeatRow = number;

/** Grid column index 0 .. columns-1. */
export type GridCol = number;

export type GridSpan = {
  rowStart: BeatRow;
  rowEnd: BeatRow;
  colStart: GridCol;
  colEnd: GridCol;
};

/** Hazard band row/col bounds — alias for platform slabs and future iris/vise kinds. */
export type HazardBandBounds = GridSpan;

export type GridOccupancy = {
  blockedCols: number[];
  effectiveGaps: number[];
  slabStart: number;
  slabEnd: number;
  pressT: number;
  pressExtent: number;
};

export type GridAnchor = {
  beatRowStart: BeatRow;
  beatRowEnd: BeatRow;
  rowEntityIds: number[];
  /** Segment identity — disambiguates beatRowIndex on loop overlap. */
  shaftSegmentEpoch?: number;
};

export type GridSpanWorldRect = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  localSlabX: number;
  rowCenterX: number;
};
