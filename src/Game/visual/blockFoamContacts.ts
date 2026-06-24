import { groupGapsToRanges } from '@/Game/water/gapRanges';
import { blockFoamTuning } from '@/config/blockFoamTuning';

export type BlockFoamContactSide = 'left' | 'right' | 'top' | 'bottom';

export type BlockFoamContact = {
  col: number;
  /** Exposed face of the solid pillar block (gap-facing or vertically open). */
  side: BlockFoamContactSide;
};

const buildGapSet = (gaps: readonly number[]): Set<number> => {
  'worklet';
  const gapSet = new Set<number>();
  for (let i = 0; i < gaps.length; i++) {
    gapSet.add(gaps[i]);
  }
  return gapSet;
};

const isSolidColumn = (
  gapSet: Set<number>,
  col: number,
  rowLength: number
): boolean => {
  'worklet';
  return col >= 0 && col < rowLength && !gapSet.has(col);
};

/**
 * Gap-adjacent pillar blocks that should carry vertical edge foam when the row is in water.
 * Supports multipath rows via contiguous gap ranges.
 */
export function collectGapEdgeFoamContacts(
  gaps: readonly number[],
  rowLength: number
): BlockFoamContact[] {
  'worklet';
  const gapSet = buildGapSet(gaps);
  const ranges = groupGapsToRanges([...gaps], rowLength);
  const contacts: BlockFoamContact[] = [];

  for (let r = 0; r < ranges.length; r++) {
    const range = ranges[r];
    const leftCol = range.startCol - 1;
    if (isSolidColumn(gapSet, leftCol, rowLength)) {
      contacts.push({ col: leftCol, side: 'right' });
    }
    const rightCol = range.endCol + 1;
    if (isSolidColumn(gapSet, rightCol, rowLength)) {
      contacts.push({ col: rightCol, side: 'left' });
    }
  }

  return contacts;
}

/**
 * Top/bottom faces of solid columns with no neighbor block in the row above/below.
 * Pass `null` when that adjacent row does not exist (screen edge of the stack).
 */
export function collectExposedHorizontalEdgeFoamContacts(
  gaps: readonly number[],
  rowAboveGaps: readonly number[] | null,
  rowBelowGaps: readonly number[] | null,
  rowLength: number
): BlockFoamContact[] {
  'worklet';
  const currentGapSet = buildGapSet(gaps);
  const aboveGapSet =
    rowAboveGaps != null ? buildGapSet(rowAboveGaps) : null;
  const belowGapSet =
    rowBelowGaps != null ? buildGapSet(rowBelowGaps) : null;
  const contacts: BlockFoamContact[] = [];

  for (let col = 0; col < rowLength; col++) {
    if (!isSolidColumn(currentGapSet, col, rowLength)) {
      continue;
    }
    if (aboveGapSet == null || !isSolidColumn(aboveGapSet, col, rowLength)) {
      contacts.push({ col, side: 'top' });
    }
    if (belowGapSet == null || !isSolidColumn(belowGapSet, col, rowLength)) {
      contacts.push({ col, side: 'bottom' });
    }
  }

  return contacts;
}

export function collectBlockFoamContacts(
  gaps: readonly number[],
  rowAboveGaps: readonly number[] | null,
  rowBelowGaps: readonly number[] | null,
  rowLength: number
): BlockFoamContact[] {
  'worklet';
  const vertical = collectGapEdgeFoamContacts(gaps, rowLength);
  const horizontal = collectExposedHorizontalEdgeFoamContacts(
    gaps,
    rowAboveGaps,
    rowBelowGaps,
    rowLength
  );
  return vertical.concat(horizontal);
}

const hash01 = (seed: number): number => {
  'worklet';
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const contactSideSalt = (side: BlockFoamContactSide): number => {
  'worklet';
  if (side === 'left') {
    return 3.1;
  }
  if (side === 'right') {
    return 7.4;
  }
  if (side === 'top') {
    return 11.8;
  }
  return 15.6;
};

/** Stable subset — not every eligible edge gets foam for a row's lifetime. */
export function pickSparseBlockFoamContacts(
  contacts: readonly BlockFoamContact[],
  rowSeed: number
): BlockFoamContact[] {
  'worklet';
  const picked: BlockFoamContact[] = [];
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const horizontal = contact.side === 'top' || contact.side === 'bottom';
    const sideMul = horizontal ? blockFoamTuning.horizontalEdgeFoamChanceMul : 1;
    const variance = 0.85 + hash01(rowSeed + contact.col * 9.7 + contactSideSalt(contact.side)) * 0.3;
    const chance = blockFoamTuning.edgeFoamChance * sideMul * variance;
    const roll = hash01(
      rowSeed * 0.31 + contact.col * 17.3 + contactSideSalt(contact.side) * 2.1
    );
    if (roll < chance) {
      picked.push(contact);
    }
  }
  return picked;
}
