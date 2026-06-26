/**
 * Aqua sprout — radial breath bloom from uFillOrigin (belly), expanding with uBreath.
 * Elliptical so breath rises more than it spreads. Crown brightens when full.
 */
export const sourceCode = `
uniform shader uBody;
uniform float uPhase;
uniform float uBreath;
uniform float uGlow;
uniform float uIntensity;
uniform float uJuiceBoost;
uniform float uDebugMode;
uniform vec2 uMeshSize;
uniform vec2 uFillOrigin;
uniform float uMotionKind;

half4 main(float2 xy) {
  half4 base = uBody.eval(xy);
  float a = base.a;
  if (a < 0.01) return half4(0);

  vec2 uv = (xy + uMeshSize * 0.5) / uMeshSize;
  float aspect = uMeshSize.x / max(uMeshSize.y, 0.001);

  if (uDebugMode > 2.5) return base;
  if (uDebugMode > 1.5) {
    float fillAmount = clamp(uBreath, 0.0, 1.0);
    vec2 originDelta = uv - uFillOrigin;
    originDelta.x *= aspect * 1.12;
    originDelta.y *= 0.84;
    float dist = length(originDelta);
    float radius = mix(0.04, 1.02, fillAmount);
    float fillMask = 1.0 - smoothstep(radius - 0.07, radius + 0.02, dist);
    float radialT = 1.0 - clamp(dist / max(radius, 0.001), 0.0, 1.0);
    float viz = fillMask * pow(radialT, 1.2);
    half3 debugTint = half3(0.35, 0.9, 1.0);
    return half4(debugTint * viz, a);
  }
  if (uDebugMode > 0.5) return half4(a, a, a, 1);

  if (uMotionKind > 0.5) {
    vec2 offset = vec2(
      sin(uPhase * 6.28318) * 0.04,
      sin(uv.y * 8.0 + uPhase * 6.28318) * 0.004
    ) * uMeshSize;
    half4 sample2 = uBody.eval(xy + offset);
    half3 kelpShimmer = max(sample2.rgb - base.rgb, half3(0));
    half3 kelpTint = half3(0.15, 0.35, 0.2);
    half3 rgb = base.rgb + kelpShimmer * uIntensity + kelpTint * kelpShimmer * 0.3;
    return half4(rgb, a);
  }

  float fillAmount = clamp(uBreath, 0.0, 1.0);
  vec2 originDelta = uv - uFillOrigin;
  originDelta.x *= aspect * 1.12;
  originDelta.y *= 0.84;
  float dist = length(originDelta);

  float minRadius = 0.038;
  float maxRadius = 1.02;
  float radius = mix(minRadius, maxRadius, fillAmount);
  float feather = 0.075 + 0.035 * (1.0 - fillAmount);
  float fillMask = 1.0 - smoothstep(radius - feather, radius + 0.02, dist);

  float radialT = 1.0 - clamp(dist / max(radius, 0.001), 0.0, 1.0);
  float radialGradient = pow(radialT, 1.4);

  float topBias = pow(1.0 - uv.y, 0.5);
  float crownBoost = mix(1.0, 1.0 + topBias * 0.9, fillAmount);

  half3 aqua = half3(0.22, 0.76, 0.9);
  half3 hot = half3(0.78, 1.0, 1.0);
  half3 coreColor = mix(aqua, hot, radialGradient * fillAmount);

  float pulse = 0.9 + 0.1 * sin(uPhase * 6.28318);
  half3 fillGlow =
    coreColor * fillMask * radialGradient * crownBoost * uGlow * uJuiceBoost * pulse;

  vec2 parallax = vec2(
    sin(uv.y * 10.0 - uPhase * 6.28318) * 0.003,
    0.0
  ) * uMeshSize;
  half4 sample2 = uBody.eval(xy + parallax);
  half3 artShimmer = max(sample2.rgb - base.rgb, half3(0));

  half3 rgb = base.rgb + artShimmer * uIntensity * 0.2;
  rgb += fillGlow;
  rgb = min(max(rgb, half3(0)), half3(1));
  return half4(rgb, a);
}
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
] as const;
