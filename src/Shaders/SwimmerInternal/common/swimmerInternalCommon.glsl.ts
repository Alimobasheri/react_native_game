/** Shared coordinate helpers for swimmer internal body shaders. */
export const swimmerInternalCommonGlsl = `
const float SWIMMER_TAU = 6.28318530718;

vec2 swimmerBodyUv(vec2 xy) {
  return (xy + uMeshSize * 0.5) / uMeshSize;
}

float swimmerBodyAspect() {
  return uMeshSize.x / max(uMeshSize.y, 0.001);
}

half4 swimmerMaskAlpha(half4 base) {
  if (base.a < 0.01) {
    return half4(0);
  }
  return base;
}
`;
