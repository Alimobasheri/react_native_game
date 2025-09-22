import { AtlasData, ClipAnimationData } from './render';

export type Assets = {
  clipAnimations: Record<string, ClipAnimationData>;
  atlases: Record<string, AtlasData>;
};
