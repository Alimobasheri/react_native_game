/**
 * Stage progression — one full directed path loop (FLOW→TENSION→CLIMAX→RELEASE) = one stage.
 * Constant water speed within a stage; relax RELEASE ramps speed; +increment after each stage.
 * Worklet-safe.
 */

export const stageProgressionTuning = {
  /** Added to session `gameplayRaisingSpeed` per stage after stage 1. */
  STAGE_SPEED_INCREMENT: 50,
  /** px/s² while in RELEASE relax corridor — visible ramp before next stage. */
  STAGE_RELAX_ACCEL_PER_SECOND: 22,
} as const;

export const computeStageConstantSpeed = (
  baseRaisingSpeed: number,
  stageIndex: number
): number => {
  'worklet';
  const stage = Math.max(1, Math.floor(stageIndex));
  return (
    baseRaisingSpeed +
    (stage - 1) * stageProgressionTuning.STAGE_SPEED_INCREMENT
  );
};

export const formatStageLabel = (stageIndex: number): string => {
  'worklet';
  return `Stage ${Math.max(1, Math.floor(stageIndex))}`;
};

export const formatStageDoneLabel = (stageIndex: number): string => {
  'worklet';
  return `Stage ${Math.max(1, Math.floor(stageIndex))} done`;
};

/** RELEASE relax ramp ceiling — next stage's constant hold speed. */
export const computeRelaxTargetSpeed = (
  baseRaisingSpeed: number,
  stageIndex: number
): number => {
  'worklet';
  return computeStageConstantSpeed(baseRaisingSpeed, stageIndex + 1);
};
