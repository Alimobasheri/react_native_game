/**
 * Kelp Drifter — rooted internal strand layer.
 * uKelpSway: x = tip horizontal amplitude, y = tip vertical amplitude, z = bend power.
 */
export const swimmerInternalKelpSwayGlsl = `
half4 sampleKelpStrands(vec2 xy, vec2 uv, float bodyAlpha) {
  float strandTop = uStrandRegion.x;
  float strandBottom = uStrandRegion.y;
  float regionH = max(strandBottom - strandTop, 0.001);

  float heightMask =
    smoothstep(strandTop - 0.03, strandTop + 0.02, uv.y) *
    (1.0 - smoothstep(strandBottom - 0.02, strandBottom + 0.03, uv.y));

  float tipWeight = clamp((strandBottom - uv.y) / regionH, 0.0, 1.0);
  float bend = pow(tipWeight, uKelpSway.z);

  float internalV = clamp((uv.y - strandTop) / regionH, 0.0, 1.0);
  float internalY = internalV * uMeshSize.y - uMeshSize.y * 0.5;

  float sway = sin(uPhase * SWIMMER_TAU);
  float offsetX = sway * uKelpSway.x * bend * uMeshSize.x;
  float offsetY = sway * uKelpSway.y * bend * bend * uMeshSize.y;

  vec2 internalXY = vec2(xy.x + offsetX, internalY + offsetY);
  half4 strands = uInternal.eval(internalXY);
  strands.a *= heightMask * bodyAlpha;
  return strands;
}

half4 debugKelpStrands(vec2 xy, vec2 uv, float bodyAlpha) {
  half4 strands = sampleKelpStrands(xy, uv, bodyAlpha);
  return half4(strands.rgb, strands.a);
}

half3 kelpSilhouetteRim(vec2 xy, float bodyAlpha) {
  float pulse = 0.88 + 0.12 * sin(uPhase * SWIMMER_TAU);
  float aL = uBody.eval(xy + vec2(-1.5, 0.0)).a;
  float aR = uBody.eval(xy + vec2(1.5, 0.0)).a;
  float aU = uBody.eval(xy + vec2(0.0, -1.5)).a;
  float aD = uBody.eval(xy + vec2(0.0, 1.5)).a;
  float edge = clamp((aL + aR + aU + aD) * 0.25 - bodyAlpha * 0.35, 0.0, 1.0);
  edge = smoothstep(0.08, 0.5, edge) * (1.0 - smoothstep(0.5, 0.98, bodyAlpha));
  return half3(0.18, 0.52, 0.32) * edge * uGlow * pulse * uJuiceBoost;
}

half4 compositeKelpSway(vec2 xy, vec2 uv, float bodyAlpha, half3 baseRgb) {
  half4 strands = sampleKelpStrands(xy, uv, bodyAlpha);
  half3 rgb = baseRgb + strands.rgb * strands.a * uIntensity;
  rgb += kelpSilhouetteRim(xy, bodyAlpha);
  rgb = min(max(rgb, half3(0)), half3(1));
  return half4(rgb, bodyAlpha);
}
`;
