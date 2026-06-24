/**
 * Explicit movement-state topology for procedural rectangle locomotion.
 * Data-only — transition rules live in kinetic systems, not here.
 * Safe to import from Reanimated worklets (plain enum values).
 */

export enum MovementState {
  IDLE = 'IDLE',
  ANTICIPATION = 'ANTICIPATION',
  STRIKE = 'STRIKE',
  DRAG = 'DRAG',
  GLIDE = 'GLIDE',
  DECELERATING = 'DECELERATING',
  PIVOT_BRAKE = 'PIVOT_BRAKE',
}

/** Canonical ordering for iteration, debug panels, and future transition tables. */
export const MOVEMENT_STATE_TOPOLOGY: readonly MovementState[] = [
  MovementState.IDLE,
  MovementState.ANTICIPATION,
  MovementState.STRIKE,
  MovementState.DRAG,
  MovementState.GLIDE,
  MovementState.DECELERATING,
  MovementState.PIVOT_BRAKE,
] as const;
