/** Calm idle surface heightfield — broad low-amplitude waves only. */
export const waterIdleSurfaceHelpers = `
  float computeIdleSurfaceOffset(vec2 containerUV) {
    float mainWave = sin(
      containerUV.x * uIdleMainWaveSpatialFreq * M_PI * 2.0 + iTime * uIdleMainWaveSpeed
    ) * uIdleMainWaveAmplitude;
    float secondaryWave = sin(
      containerUV.x * uIdleSecondaryWaveSpatialFreq * M_PI * 2.0 -
        iTime * uIdleSecondaryWaveSpeed + 1.7
    ) * uIdleSecondaryWaveAmplitude;
    float breathing = sin(iTime * uIdleBreathingSpeed) * uIdleBreathingAmount;
    float combined = mainWave + secondaryWave + breathing;
    return clamp(combined, -uIdleMaxCombinedAmplitude, uIdleMaxCombinedAmplitude);
  }
`;
