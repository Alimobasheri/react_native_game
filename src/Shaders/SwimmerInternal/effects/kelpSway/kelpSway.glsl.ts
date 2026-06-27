/**
 * Kelp Drifter — green glow pulses root → tip, strengthening toward tips (synced to uPhase).
 */
export const kelpSwayEffectGlsl = `
void kelpStrandMotion(
  vec2 xy,
  vec2 uv,
  vec2 extraOffset,
  out vec2 internalXY,
  out float tipWeight,
  out float internalV,
  out float heightMask,
  out float sway,
  out float bend
) {
  float strandTop = uStrandRegion.x;
  float strandBottom = uStrandRegion.y;
  float regionH = max(strandBottom - strandTop, 0.001);

  heightMask =
    smoothstep(strandTop - 0.03, strandTop + 0.02, uv.y) *
    (1.0 - smoothstep(strandBottom - 0.02, strandBottom + 0.03, uv.y));

  tipWeight = clamp((strandBottom - uv.y) / regionH, 0.0, 1.0);
  bend = pow(tipWeight, uKelpSway.z);
  float ampScale = uSwayKinematic.x;
  float dirBias = uSwayKinematic.y;

  internalV = clamp((uv.y - strandTop) / regionH, 0.0, 1.0);
  float internalY = internalV * uMeshSize.y - uMeshSize.y * 0.5;

  sway = sin(uPhase * SWIMMER_TAU);
  float offsetX = (sway + dirBias) * uKelpSway.x * ampScale * bend * uMeshSize.x;
  float offsetY = sway * uKelpSway.y * ampScale * bend * bend * uMeshSize.y;

  internalXY = vec2(xy.x + offsetX, internalY + offsetY) + extraOffset;
}

float kelpRootToTipPulse(float rootToTip) {
  float pulsePos = fract(uPhase);
  float filled = 1.0 - smoothstep(pulsePos - 0.03, pulsePos + 0.1, rootToTip);
  float waveFront =
    smoothstep(pulsePos - 0.2, pulsePos, rootToTip) *
    (1.0 - smoothstep(pulsePos, pulsePos + 0.14, rootToTip));
  float buildUp = mix(0.4, 1.0, pow(rootToTip, 0.82));
  float cycleFade = 1.0 - smoothstep(0.9, 1.0, pulsePos);
  float pulseMix = (filled * buildUp * 0.75 + waveFront * 1.35) * cycleFade;
  return pulseMix + 0.14 * buildUp;
}

half3 kelpStrandFlowGlow(
  half4 strands,
  float tipWeight,
  float sway,
  float bend
) {
  float rawAlpha = strands.a;
  if (rawAlpha < 0.0005) {
    return half3(0);
  }

  float strandMask = pow(clamp(rawAlpha, 0.0, 1.0), 0.42);
  float ampScale = clamp(uSwayKinematic.x, 0.45, 1.55);
  float rootToTip = tipWeight;

  float pulseMix = kelpRootToTipPulse(rootToTip);
  float swayMod = 0.82 + 0.18 * abs(sway);

  half3 strandRgb = strands.rgb / max(rawAlpha, 0.001);
  half3 kelpDeep = half3(0.1, 0.52, 0.22);
  half3 kelpBright = half3(0.28, 0.88, 0.38);
  half3 glowColor = mix(kelpDeep, kelpBright, clamp(rootToTip * 0.85 + pulseMix * 0.25, 0.0, 1.0));
  glowColor = mix(glowColor, strandRgb * half3(0.3, 1.05, 0.42), 0.22);

  float glowStrength =
    strandMask * pulseMix * swayMod * max(bend, 0.2) *
    ampScale * uGlow * uJuiceBoost * 1.15;

  return glowColor * glowStrength;
}

half4 debugKelpStrands(vec2 xy, vec2 uv, float bodyAlpha) {
  vec2 internalXY;
  float tipWeight;
  float internalV;
  float heightMask;
  float sway;
  float bend;
  kelpStrandMotion(xy, uv, vec2(0.0), internalXY, tipWeight, internalV, heightMask, sway, bend);

  half4 strands = uInternal.eval(internalXY);
  strands.a *= heightMask * bodyAlpha;

  half3 glow = kelpStrandFlowGlow(strands, tipWeight, sway, bend);
  return half4(strands.rgb * strands.a + glow, max(strands.a, 0.15));
}

half3 kelpSilhouetteRim(vec2 xy, float bodyAlpha, float sway) {
  float rimPulse = 0.75 + 0.25 * abs(sway);
  float aL = uBody.eval(xy + vec2(-1.5, 0.0)).a;
  float aR = uBody.eval(xy + vec2(1.5, 0.0)).a;
  float aU = uBody.eval(xy + vec2(0.0, -1.5)).a;
  float aD = uBody.eval(xy + vec2(0.0, 1.5)).a;
  float edge = clamp((aL + aR + aU + aD) * 0.25 - bodyAlpha * 0.35, 0.0, 1.0);
  edge = smoothstep(0.08, 0.5, edge) * (1.0 - smoothstep(0.5, 0.98, bodyAlpha));
  return half3(0.12, 0.44, 0.22) * edge * uGlow * rimPulse * uJuiceBoost * 0.3;
}

half4 compositeKelpSway(vec2 xy, vec2 uv, float bodyAlpha, half3 baseRgb) {
  vec2 internalXY;
  float tipWeight;
  float internalV;
  float heightMask;
  float sway;
  float bend;
  kelpStrandMotion(xy, uv, vec2(0.0), internalXY, tipWeight, internalV, heightMask, sway, bend);

  half4 strands = uInternal.eval(internalXY);
  strands.a *= heightMask * bodyAlpha;

  float pulseMix = kelpRootToTipPulse(tipWeight);
  float swayMod = 0.82 + 0.18 * abs(sway);

  vec2 flowParallax = vec2(
    sway * uKelpSway.x * 0.35,
    -pulseMix * uKelpSway.y * 4.0
  ) * uMeshSize * uSwayKinematic.x * bend;
  half4 strandsFlow = uInternal.eval(internalXY + flowParallax);
  strandsFlow.a *= heightMask * bodyAlpha;

  half3 shimmerRaw = max(strandsFlow.rgb - strands.rgb, half3(0));
  half3 greenShimmer = shimmerRaw * half3(0.14, 0.9, 0.3);

  half3 flowGlow = kelpStrandFlowGlow(strands, tipWeight, sway, bend);

  half3 rgb = baseRgb + strands.rgb * strands.a * uIntensity;
  rgb += flowGlow;
  rgb += greenShimmer * pulseMix * swayMod * strands.a * uGlow * uJuiceBoost * 0.55;
  rgb += kelpSilhouetteRim(xy, bodyAlpha, sway);
  rgb = min(max(rgb, half3(0)), half3(1));
  return half4(rgb, bodyAlpha);
}
`;
