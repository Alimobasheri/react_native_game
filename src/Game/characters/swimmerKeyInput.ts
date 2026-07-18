/** Keys TapSwimmer listens for via RNTGE Keyboard component. */
export const SWIMMER_KEYBOARD_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'a',
  'A',
  'd',
  'D',
] as const;

/**
 * Maps a keyboard `key` to the same left/right tap direction used by TapSwimmer.
 * Left / A → -1; Right / D → 1; anything else → null.
 */
export const keyToTapDirection = (key: string): -1 | 1 | null => {
  'worklet';
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
    return -1;
  }
  if (key === 'ArrowRight' || key === 'd' || key === 'D') {
    return 1;
  }
  return null;
};
