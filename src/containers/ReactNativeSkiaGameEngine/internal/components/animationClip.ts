export const AnimationClipComponentName = 'AnimationClip';

export interface AnimationClipComponentData {
  assetId: string;
  clipId: string;
  frameIndex: number;
  elapsedTime: number;
  speed: number;
  isPlaying: boolean;
}

export const createAnimationClipComponent = (
  data: AnimationClipComponentData
) => {
  return { name: AnimationClipComponentName, data };
};
