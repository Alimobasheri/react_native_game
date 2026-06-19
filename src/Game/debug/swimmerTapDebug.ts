/** Set false to silence swimmer tap / velocity debug logs. */
export const SWIMMER_TAP_DEBUG_ENABLED = true;

export function logSwimmerTapDebug(line: string): void {
  if (
    SWIMMER_TAP_DEBUG_ENABLED &&
    typeof __DEV__ !== 'undefined' &&
    __DEV__
  ) {
    console.log(line);
  }
}
