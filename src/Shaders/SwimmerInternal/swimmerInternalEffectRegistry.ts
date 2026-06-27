import type { CompositeShaderChildImage } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import type { SwimmerSkinDefinition } from '@/Game/characters/swimmerSkins';
import type { InternalMotionProfileId } from '@/Game/characters/life/swimmerLifeTypes';
import { sourceCode as kelpSwayEffectSourceCode } from './effects/kelpSway/kelpSwayComposite';
import { sourceCode as rippleEffectSourceCode } from './effects/ripple/rippleComposite';
import {
  KELP_SWAY_EFFECT_SHADER_KEY,
  KELP_SWAY_EFFECT_UNIFORM_KEYS,
} from './effects/kelpSway/kelpSwayUniforms';
import {
  RIPPLE_EFFECT_SHADER_KEY,
  RIPPLE_EFFECT_UNIFORM_KEYS,
} from './effects/ripple/rippleUniforms';

/** Implemented internal body effects — one SKSL module per motion type. */
export type SwimmerInternalEffectId = Exclude<InternalMotionProfileId, 'none'>;

/** Worklet-safe metadata only — no functions (Reanimated strips those from objects). */
export type SwimmerInternalEffectMeta = {
  readonly id: SwimmerInternalEffectId;
  readonly shaderKey: string;
  readonly uniformKeys: readonly string[];
};

export const SWIMMER_INTERNAL_EFFECT_META: Record<
  SwimmerInternalEffectId,
  SwimmerInternalEffectMeta
> = {
  ripple: {
    id: 'ripple',
    shaderKey: RIPPLE_EFFECT_SHADER_KEY,
    uniformKeys: RIPPLE_EFFECT_UNIFORM_KEYS,
  },
  kelpSway: {
    id: 'kelpSway',
    shaderKey: KELP_SWAY_EFFECT_SHADER_KEY,
    uniformKeys: KELP_SWAY_EFFECT_UNIFORM_KEYS,
  },
};

export const getSwimmerInternalEffect = (
  profile: InternalMotionProfileId
): SwimmerInternalEffectMeta | null => {
  'worklet';
  if (profile === 'none') {
    return null;
  }
  return SWIMMER_INTERNAL_EFFECT_META[profile];
};

export const resolveInternalEffectChildImages = (
  profile: SwimmerInternalEffectId,
  skin: SwimmerSkinDefinition
): CompositeShaderChildImage[] => {
  'worklet';
  if (profile === 'kelpSway') {
    return [
      { imageKey: skin.bodyImageKey },
      { imageKey: skin.internalImageKey ?? skin.bodyImageKey },
    ];
  }
  return [{ imageKey: skin.bodyImageKey }];
};

/** Shader source map for RNTGE preload — register only effects you ship. */
export const SWIMMER_INTERNAL_EFFECT_SHADER_SOURCES: Record<
  SwimmerInternalEffectId,
  string
> = {
  ripple: rippleEffectSourceCode,
  kelpSway: kelpSwayEffectSourceCode,
};
