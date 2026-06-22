import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const ScoreComponentName = 'Score';

export type ScoreHudAnimState = {
  displayedInteger: number;
  lastInteger: number;
  entranceStartMs: number;
  popStartMs: number;
  milestonePopStartMs: number;
  newBestStartMs: number;
  beatBestShown: boolean;
  lastMilestone: number;
};

export type ScoreComponentData = {
  score: number;
  /** Accumulated ms toward next 30ms score tick. */
  accumulatedTime: number;
  hud: ScoreHudAnimState;
};

export const createDefaultScoreHudAnimState = (): ScoreHudAnimState => ({
  displayedInteger: 0,
  lastInteger: 0,
  entranceStartMs: 0,
  popStartMs: 0,
  milestonePopStartMs: 0,
  newBestStartMs: 0,
  beatBestShown: false,
  lastMilestone: 0,
});

export const createScoreComponent = (
  data: Omit<ScoreComponentData, 'hud'> & { hud?: Partial<ScoreHudAnimState> }
): Component<ScoreComponentData> => {
  'worklet';
  const { hud, ...rest } = data;
  return {
    name: ScoreComponentName,
    data: {
      ...rest,
      hud: { ...createDefaultScoreHudAnimState(), ...hud },
    },
  };
};
