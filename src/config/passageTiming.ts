/**
 * Passage timing windows — commit fractions keyed by stageIndex (Track 2+).
 * Stage water speed SSOT: `stageProgression.ts` + `StageSpeedSystem`.
 * Worklet-safe.
 */

export type CommitWindow = {
  commitStart: number;
  commitEnd: number;
};

export const passageTimingTuning = {
  /** Slice B: gapBlend fractions for perfect commit — wider on early stages. */
  commitWindowByStageIndex: {
    1: { commitStart: 0.15, commitEnd: 0.75 },
    2: { commitStart: 0.2, commitEnd: 0.7 },
    3: { commitStart: 0.25, commitEnd: 0.65 },
  } as Record<number, CommitWindow>,
  defaultCommitWindow: { commitStart: 0.25, commitEnd: 0.65 } as CommitWindow,
} as const;

export const resolveCommitWindowForStage = (stageIndex: number): CommitWindow => {
  'worklet';
  const stage = Math.max(1, Math.floor(stageIndex));
  return (
    passageTimingTuning.commitWindowByStageIndex[stage] ??
    passageTimingTuning.defaultCommitWindow
  );
};
