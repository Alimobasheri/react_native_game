import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  SpriteComponentName,
  SpriteComponentData,
  AtlasSpriteData,
  SpriteSheetData,
} from '../../components/sprite';
import { AnimationClipComponentName } from '../../components/animationClip';
import { hashString } from '@/containers/ReactNativeSkiaGameEngine/utils/hasString';

const updateSimpleSpriteAnimation = (
  sprite: SpriteComponentData,
  deltaTime: number
): void => {
  'worklet';
  if (!sprite.isPlaying || !sprite.frameDuration || !sprite.totalFrames) return;

  const currentTime = Date.now();
  if (sprite.lastFrameTime === undefined) {
    sprite.lastFrameTime = currentTime;
    sprite.currentFrame = 0;
    return;
  }

  const elapsed = currentTime - sprite.lastFrameTime;
  if (elapsed >= sprite.frameDuration) {
    const nextFrame = (sprite.currentFrame || 0) + 1;
    if (nextFrame >= sprite.totalFrames) {
      sprite.currentFrame = sprite.loop ? 0 : sprite.totalFrames - 1;
    } else {
      sprite.currentFrame = nextFrame;
    }
    sprite.lastFrameTime = currentTime;
  }
};

const updateAdvancedSpriteAnimation = (
  sprite: SpriteComponentData,
  clipPlayer: any,
  animationAssets: any
): void => {
  'worklet';
  const clips = animationAssets[clipPlayer.assetId]?.clips;
  if (!clips) return;

  const clip = clips[clipPlayer.clipId];
  if (!clip) return;

  // Universal frame mapping - works for any animation setup
  let spriteSheetFrame = clipPlayer.frameIndex;

  // Check if this clip has a frame offset defined in the clip data
  if (clip.frameOffset !== undefined) {
    spriteSheetFrame = clipPlayer.frameIndex + clip.frameOffset;
  }

  // Update the sprite's current frame
  if (sprite.currentFrame !== spriteSheetFrame) {
    sprite.currentFrame = spriteSheetFrame;
  }
};

export const spriteUpdateSystem: System = {
  requiredComponents: [SpriteComponentName],
  process: ({ entities, components, eventQueue, deltaTime, ecs, assets }) => {
    'worklet';
    const animationAssets = assets.value.clipAnimations;

    entities.forEach((entity) => {
      const sprite = components[SpriteComponentName].get(entity);
      const clipPlayer = components[AnimationClipComponentName]?.get(entity);

      // Priority 1: Advanced animation system (AnimationClipComponent present)
      if (clipPlayer) {
        updateAdvancedSpriteAnimation(sprite, clipPlayer, animationAssets);
      }
      // Priority 2: Simple sprite animation (fallback)
      else if (sprite.currentFrame !== undefined) {
        updateSimpleSpriteAnimation(sprite, deltaTime);
      }
    });
  },
};
