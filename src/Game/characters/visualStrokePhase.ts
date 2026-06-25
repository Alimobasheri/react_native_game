/** Visual-only stroke phase — decoupled from physics movement states. */
export enum VisualStrokePhase {
  IDLE = 'IDLE',
  ANTICIPATION = 'ANTICIPATION',
  STROKE = 'STROKE',
  GLIDE = 'GLIDE',
  RECOVERY = 'RECOVERY',
  PIVOT = 'PIVOT',
}
