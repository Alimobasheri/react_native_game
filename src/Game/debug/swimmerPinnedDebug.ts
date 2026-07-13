/** Set false to silence pinned under-block debug logs. */
export const SWIMMER_PINNED_DEBUG_ENABLED = true;

let lastPinnedLogMs = 0;

export function logSwimmerPinnedDebug(line: string): void {
  'worklet';
  if (
    !SWIMMER_PINNED_DEBUG_ENABLED ||
    typeof __DEV__ === 'undefined' ||
    !__DEV__
  ) {
    return;
  }
  const now = Date.now();
  if (now - lastPinnedLogMs < 80) {
    return;
  }
  lastPinnedLogMs = now;
  console.log(line);
}
