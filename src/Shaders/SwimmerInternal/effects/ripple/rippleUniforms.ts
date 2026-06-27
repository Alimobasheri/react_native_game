/** SKSL uniforms for Aqua Sprout ripple internal effect. */
export const rippleEffectShaderUniforms = `
uniform shader uBody;
uniform float uPhase;
uniform float uBreath;
uniform float uGlow;
uniform float uIntensity;
uniform float uJuiceBoost;
uniform float uDebugMode;
uniform vec2 uMeshSize;
uniform vec2 uFillOrigin;
`;

export const RIPPLE_EFFECT_UNIFORM_KEYS = [
  'uPhase',
  'uBreath',
  'uGlow',
  'uIntensity',
  'uJuiceBoost',
  'uDebugMode',
  'uMeshSize',
  'uFillOrigin',
] as const;

export type RippleEffectUniformKey = (typeof RIPPLE_EFFECT_UNIFORM_KEYS)[number];

export const RIPPLE_EFFECT_SHADER_KEY = 'swimmerInternalRipple' as const;
