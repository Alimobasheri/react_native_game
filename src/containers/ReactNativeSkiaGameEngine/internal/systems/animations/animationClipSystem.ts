import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  AnimationClipComponentData,
  AnimationClipComponentName,
} from '../../components/animationClip';
import { ClipAnimationData } from '@/containers/ReactNativeSkiaGameEngine/types-ecs/render';

export const animationClipSystem: System = {
  requiredComponents: [AnimationClipComponentName],
  process: ({ entities, components, eventQueue, deltaTime }) => {
    'worklet';
    const animationAssets: Record<string, ClipAnimationData> =
      global._RNTGE_.clipAnimationCache;

    entities.forEach((entity) => {
      const clipPlayer: AnimationClipComponentData =
        components[AnimationClipComponentName].get(entity);
      if (!clipPlayer) return;

      const clips = animationAssets[clipPlayer.assetId]?.clips;
      if (!clips) return;

      const clip = clips[clipPlayer.clipId];
      if (!clip) return;

      clipPlayer.elapsedTime += deltaTime;
      const currentFrameData = clip.frames[clipPlayer.frameIndex];

      if (clipPlayer.elapsedTime >= currentFrameData.duration) {
        clipPlayer.elapsedTime = 0;

        if (currentFrameData.event) {
          eventQueue.addEvent({
            type: currentFrameData.event,
            payload: { entityId: entity },
          });
        }

        let nextFrame = clipPlayer.frameIndex + 1;
        if (nextFrame >= clip.frames.length) {
          nextFrame = clip.loop ? 0 : clip.frames.length - 1;
        }
        clipPlayer.frameIndex = nextFrame;
      }
    });
  },
};
