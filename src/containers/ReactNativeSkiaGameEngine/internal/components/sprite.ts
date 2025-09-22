import { Component } from '../../services-ecs';

export const SpriteComponentName = 'sprite';

// Base animation properties shared by both types
interface BaseAnimationData {
  currentFrame?: number;
  frameDuration?: number;
  totalFrames?: number;
  loop?: boolean;
  lastFrameTime?: number;
  isPlaying?: boolean;
}

// Atlas-based sprite data - supports variable frame sizes and positions
export interface AtlasSpriteData extends BaseAnimationData {
  type: 'atlas';
  assetId: string; // Reference to the atlas asset
  frameData: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[]; // Array of frame positions and sizes in the atlas
}

// Simple sprite sheet data - uniform frame sizes
export interface SpriteSheetData extends BaseAnimationData {
  type: 'sprite';
  assetId: string; // Reference to the sprite sheet asset
  frameWidth: number;
  frameHeight: number;
  framesPerRow: number;
}

// Discriminated union for sprite component data
export type SpriteComponentData = AtlasSpriteData | SpriteSheetData;

export const createSpriteComponent = (
  data: SpriteComponentData
): Component<SpriteComponentData> => {
  return { name: SpriteComponentName, data };
};

// Helper function to create an atlas-based animated sprite component
export const createAtlasAnimatedSpriteComponent = (
  assetId: string,
  frameData: { x: number; y: number; width: number; height: number }[],
  animationConfig: {
    frameDuration: number;
    loop?: boolean;
    isPlaying?: boolean;
  }
): Component<SpriteComponentData> => {
  'worklet';
  return {
    name: SpriteComponentName,
    data: {
      type: 'atlas',
      assetId,
      frameData,
      currentFrame: 0,
      frameDuration: animationConfig.frameDuration,
      totalFrames: frameData.length,
      loop: animationConfig.loop ?? true,
      isPlaying: animationConfig.isPlaying ?? true,
      lastFrameTime: undefined,
    },
  };
};

// Helper function to create a simple sprite sheet animated component
export const createSpriteSheetAnimatedComponent = (
  assetId: string,
  animationConfig: {
    frameWidth: number;
    frameHeight: number;
    framesPerRow: number;
    totalFrames: number;
    frameDuration: number;
    loop?: boolean;
    isPlaying?: boolean;
  }
): Component<SpriteComponentData> => {
  'worklet';
  return {
    name: SpriteComponentName,
    data: {
      type: 'sprite',
      assetId,
      frameWidth: animationConfig.frameWidth,
      frameHeight: animationConfig.frameHeight,
      framesPerRow: animationConfig.framesPerRow,
      totalFrames: animationConfig.totalFrames,
      currentFrame: 0,
      frameDuration: animationConfig.frameDuration,
      loop: animationConfig.loop ?? true,
      isPlaying: animationConfig.isPlaying ?? true,
      lastFrameTime: undefined,
    },
  };
};
