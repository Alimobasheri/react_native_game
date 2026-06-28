/** Set false to silence signature boss (pinballHop) debug logs. */
export const SIGNATURE_BOSS_DEBUG_ENABLED = true;

/** Called from `baseMultiPathGetRow` (UI thread / worklet). */
export function logSignatureBossDebug(line: string): void {
  'worklet';
  if (SIGNATURE_BOSS_DEBUG_ENABLED) {
    console.log(line);
  }
}
