/** Surface lip above water — idle uses thin highlight only; gameplay adds foam. */
export const waterSurfaceShaderHelpers = `
  vec4 renderSurfaceAboveWater(
    vec2 containerUV,
    vec2 uv,
    float surfaceH,
    float calmness,
    float flowVelocity,
    float pressure,
    float softGap,
    float activeBandMask,
    float surgeEnergy,
    float rectangleMask
  ) {
    float distAbove = surfaceH - containerUV.y;
    float highlightBand = smoothstep(uSurfaceHighlightThickness * 2.8, 0.0, distAbove) *
      smoothstep(-uSurfaceHighlightThickness * 0.35, uSurfaceHighlightThickness * 0.9, distAbove);
    float undersideBand = smoothstep(uSurfaceHighlightThickness * 3.2, uSurfaceHighlightThickness * 0.25, distAbove) *
      (1.0 - highlightBand);
    vec3 highlightColor = uWaterHighlight;
    float curveLift = abs(sin(
      containerUV.x * uIdleMainWaveSpatialFreq * M_PI * 2.0 + iTime * uIdleMainWaveSpeed
    ));
    highlightColor *= mix(1.0, 0.82 + curveLift * 0.18, 1.0 - uVisualIntensity);
    vec3 undersideColor = uWaterColorMid * 0.58;
    vec3 lipColor = mix(undersideColor, highlightColor, highlightBand);
    lipColor = mix(lipColor, undersideColor, undersideBand * 0.4);
    float lipAlpha = max(highlightBand * 0.92, undersideBand * 0.35);

    if (uVisualIntensity < 0.08) {
      return vec4(lipColor, lipAlpha * rectangleMask);
    }

    float calmSurfaceOffset = sin(containerUV.x * frequency * 2.5 + iTime * speed * 0.025) * calmness * 0.0015;
    float foamIntensityScale = mix(1.6, 3.0, uVisualIntensity);
    float w = WaterMask(
      uv,
      surfaceH + calmSurfaceOffset,
      iTime * speed * (4.0 + 2.0 * abs(flowVelocity)),
      amplitude * (0.35 + 0.65 * calmness),
      frequency
    );
    vec2 wavePosition = YPosition(
      uv,
      surfaceH,
      iTime * speed * 0.16,
      amplitude * (0.025 + 0.035 * calmness),
      frequency
    );

    float foamNoise = noise(wavePosition * (2.0 + 1.0 * pressure) * frequency);
    float clampedW = clamp(1.0 - w, 0.0, 1.0);
    float foam = 1.0 - foamIntensity(foamNoise, clampedW) * foamIntensityScale;
    float clampedFoam = clamp(foam, 0.0, 1.0);
    float whiteCap = 1.0 / exp(smoothstep(surfaceH, surfaceH + 0.01, wavePosition.y) * 0.5);
    vec3 waterMix = mix(vec3(1.0) * clampedFoam, w * waterColor, 0.8);
    float foamBoost = 0.95 + pressure * 0.32 * softGap * activeBandMask + surgeEnergy * 0.25;
    float surfaceVisibility = mix(1.0, softGap, activeBandMask);
    waterMix = mix(lipColor, waterMix, uVisualIntensity);
    lipAlpha = mix(lipAlpha, w * whiteCap * foamBoost, uVisualIntensity);
    return vec4(waterMix, lipAlpha * rectangleMask * surfaceVisibility);
  }
`;
