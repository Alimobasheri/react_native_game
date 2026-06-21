/**
 * Orange block 2D lighting — palette and strengths for swimmer obstacles.
 * Worklet-safe: plain strings and numbers only.
 * Style bible §4 / §6 (Block Top/Mid/Shadow/Edge/Highlight).
 */

/** Block Highlight #FFD46B */
export const BLOCK_HIGHLIGHT_COLOR = '#FFD46B';

/** Block Edge Dark #7A2B14 — crevices, deep AO */
export const BLOCK_EDGE_DARK_COLOR = '#7A2B14';

/** Block Shadow #B94417 — shade washes, seam AO */
export const BLOCK_SHADOW_COLOR = '#B94417';

/** Cave Shadow #120B22 — contact shadow under exposed bottoms */
export const BLOCK_CONTACT_SHADOW_COLOR = '#120B22';

/** Face region as fraction of cell height (excludes baked sprite depth tail). */
export const BLOCK_FACE_HEIGHT_RATIO = 0.85;

/** Seam / AO strip width as fraction of block width. */
export const BLOCK_AO_STRIP_WIDTH_RATIO = 0.045;

/** Vertical crevice width as fraction of block width (min 1 px applied at build time). */
export const BLOCK_CREVICE_WIDTH_RATIO = 0.018;

/** Bottom contact shadow height as fraction of block height. */
export const BLOCK_CONTACT_SHADOW_HEIGHT_RATIO = 0.055;

/** Bottom shade strip height as fraction of face height. */
export const BLOCK_BOTTOM_SHADE_HEIGHT_RATIO = 0.14;

/** Right shade strip width as fraction of block width. */
export const BLOCK_RIGHT_SHADE_WIDTH_RATIO = 0.11;

/** Top-left highlight patch size as fraction of face width/height. */
export const BLOCK_HIGHLIGHT_SIZE_RATIO = 0.28;

export const BLOCK_HIGHLIGHT_OPACITY = 0.22;
export const BLOCK_SHADE_OPACITY = 0.28;
export const BLOCK_AO_OPACITY = 0.42;
export const BLOCK_CREVICE_OPACITY = 0.65;
export const BLOCK_CONTACT_SHADOW_OPACITY = 0.38;
