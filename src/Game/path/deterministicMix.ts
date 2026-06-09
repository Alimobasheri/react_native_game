/**
 * Pure 32-bit mixing for worklet-safe deterministic "randomness".
 * No Math.random — same inputs always yield the same output.
 */

/** Unsigned 32-bit mix of three integer salts (order matters). */
export function mixU32(a: number, b: number, c: number): number {
  'worklet';
  let x =
    (a >>> 0) ^
    (Math.imul(b >>> 0, 0x9e3779b1) >>> 0) ^
    (Math.imul(c >>> 0, 0x85ebca6b) >>> 0);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return x >>> 0;
}

/**
 * Deterministic noise for a spawned row: fold `pathRunId`, monotonic `proceduralStreamSalt`,
 * `rowIndex`, and an integer salt. Must stay a **file-level** worklet (not nested) so the
 * worklets Babel plugin registers it when called from other worklets.
 */
export function mixPathRowStreamSalt(
  pathRunId: number,
  rowIndex: number,
  proceduralStreamSalt: number,
  salt: number
): number {
  'worklet';
  const stream = proceduralStreamSalt >>> 0;
  return mixU32(mixU32(pathRunId, stream, 0x4e16b5e5), rowIndex, salt);
}

/** [0, 1) from a mixed word (24-bit mantissa, stable across engines). */
export function unitFloatFromU32(x: number): number {
  'worklet';
  return ((x >>> 0) & 0xffffff) / 0x1000000;
}

/** Non-negative remainder: result in [0, mod) for mod > 0. */
export function intMod(x: number, mod: number): number {
  'worklet';
  if (mod <= 0) return 0;
  return (Math.abs(x >>> 0) % mod + mod) % mod;
}
