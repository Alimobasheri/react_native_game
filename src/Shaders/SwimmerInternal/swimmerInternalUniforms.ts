/** Shared SKSL uniform block for the swimmer body composite shader. */
export const swimmerInternalShaderUniforms = `
uniform shader uBody;
uniform shader uInternal;
uniform float uPhase;
uniform float uBreath;
uniform float uGlow;
uniform float uIntensity;
uniform float uJuiceBoost;
uniform float uDebugMode;
uniform vec2 uMeshSize;
uniform vec2 uFillOrigin;
uniform float uMotionKind;
uniform vec2 uStrandRegion;
uniform vec3 uKelpSway;
`;

export const SWIMMER_INTERNAL_UNIFORM_KEYS = [
  'uPhase',
  'uBreath',
  'uGlow',
  'uIntensity',
  'uJuiceBoost',
  'uDebugMode',
  'uMeshSize',
  'uFillOrigin',
  'uMotionKind',
  'uStrandRegion',
  'uKelpSway',
] as const;

export type SwimmerInternalUniformKey =
  (typeof SWIMMER_INTERNAL_UNIFORM_KEYS)[number];

/** Must match `uMotionKind` branches in swimmerInternalComposite SKSL. */
export const SWIMMER_INTERNAL_MOTION_KIND = {
  ripple: 0,
  kelpSway: 1,
} as const;
