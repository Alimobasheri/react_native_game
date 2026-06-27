/** SKSL uniforms for Kelp Drifter sway internal effect. */
export const kelpSwayEffectShaderUniforms = `
uniform shader uBody;
uniform shader uInternal;
uniform float uPhase;
uniform float uGlow;
uniform float uIntensity;
uniform float uJuiceBoost;
uniform float uDebugMode;
uniform vec2 uMeshSize;
uniform vec2 uStrandRegion;
uniform vec3 uKelpSway;
uniform vec2 uSwayKinematic;
`;

export const KELP_SWAY_EFFECT_UNIFORM_KEYS = [
  'uPhase',
  'uGlow',
  'uIntensity',
  'uJuiceBoost',
  'uDebugMode',
  'uMeshSize',
  'uStrandRegion',
  'uKelpSway',
  'uSwayKinematic',
] as const;

export type KelpSwayEffectUniformKey =
  (typeof KELP_SWAY_EFFECT_UNIFORM_KEYS)[number];

export const KELP_SWAY_EFFECT_SHADER_KEY = 'swimmerInternalKelpSway' as const;
