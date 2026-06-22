/** Water body fill: depth gradient, wall darkening, internal motion, surface lip. */
export const waterBodyShaderHelpers = `
  vec3 sampleWaterDepthGradient(float depth, float depthBelowSurface) {
    float surfaceBandNorm = clamp(uSurfaceBandHalfHeight * 2.0, 0.04, 0.14);
    float nearSurface = 1.0 - smoothstep(0.0, surfaceBandNorm, depthBelowSurface);
    vec3 deep = uWaterColorDeep;
    vec3 mid = uWaterColorMid;
    vec3 surface = uWaterColorSurface;
    // Thin flood column: compress dark to bottom ~18%, keep upper body bright.
    float depthLift = pow(clamp(depth, 0.0, 1.0), 0.5);
    vec3 grad = mix(deep, mid, smoothstep(0.0, 0.18, depth));
    grad = mix(grad, surface, smoothstep(0.42, 0.92, depthLift));
    grad = mix(grad, surface * 1.05 + uWaterHighlight * 0.14, nearSurface * 0.72);
    return grad;
  }

  vec3 applyInternalSoftDetail(vec3 color, vec2 flowUV, float depth, float idleMotion) {
    float shapeOpacity = uInternalShapeOpacity * (1.0 - uVisualIntensity * 0.55);
    if (shapeOpacity < 0.001) {
      return color;
    }
    float blobA = noise(vec2(flowUV.x * 0.55 + 0.2, flowUV.y * 1.8 - iTime * uInternalCurrentSpeed * 0.35));
    float blobB = noise(vec2(flowUV.x * 0.42 - 0.15, flowUV.y * 2.2 - iTime * uInternalCurrentSpeed * 0.28 + 3.1));
    float softLight = smoothstep(0.58, 0.86, blobA) * shapeOpacity * (0.35 + 0.25 * (1.0 - depth));
    float softDark = smoothstep(0.62, 0.9, blobB) * shapeOpacity * 0.28 * smoothstep(0.0, 0.45, depth);
    color += vec3(0.04, 0.14, 0.34) * softLight;
    color -= vec3(0.02, 0.05, 0.12) * softDark;
    return color;
  }

  vec3 applySurfaceLip(vec3 color, float depthBelowSurface) {
    float lip = 1.0 - smoothstep(0.0, uSurfaceHighlightThickness * 2.2, depthBelowSurface);
    float underside = smoothstep(uSurfaceHighlightThickness * 0.4, uSurfaceHighlightThickness * 2.8, depthBelowSurface) *
      (1.0 - lip);
    vec3 highlight = uWaterHighlight * mix(0.82, 0.55, uVisualIntensity);
    vec3 under = uWaterColorMid * 0.62;
    color = mix(color, highlight, lip * mix(0.75, 0.4, uVisualIntensity));
    color = mix(color, under, underside * 0.28);
    return color;
  }

  float bubbleRiseSpeed(float visual) {
    float base = mix(uRiseStreakIdleSpeed * 0.9, uInternalCurrentSpeed * 0.48, visual);
    return base + speed * uBubbleRiseFromWaterSpeed * visual;
  }

  float risingStreakLayer(
    vec2 waterUV,
    float depth,
    float depthBelowSurface,
    float layerSeed,
    float riseSpeed,
    float streakOpacity,
    float lengthScale,
    float speedScale
  ) {
    float cols = 4.0 + layerSeed * 2.2;
    float rowScale = mix(7.0, 10.5, layerSeed) / max(lengthScale, 0.85);
    vec2 scrollUV = vec2(
      waterUV.x * cols + sin(layerSeed * 4.7) * 0.15,
      waterUV.y * rowScale - iTime * riseSpeed * speedScale * mix(0.7, 1.15, layerSeed)
    );
    vec2 cellId = floor(scrollUV);
    vec2 cellUV = fract(scrollUV) - 0.5;

    float spawnRoll = random(cellId + layerSeed * 19.3);
    float spawnCutoff = mix(0.54, 0.38, uVisualIntensity);
    if (spawnRoll < spawnCutoff) {
      return 0.0;
    }

    float hero = step(1.0 - uRiseStreakLongChance, random(cellId + layerSeed * 31.7));
    float width = (mix(0.1, 0.055, layerSeed) + random(cellId + 2.4) * 0.04) * mix(1.0, 0.82, hero);
    float curve = sin(cellUV.y * 3.14159 + random(cellId + 5.1) * 6.28318) * mix(0.04, 0.11, layerSeed);
    float dashFreq = mix(1.0, 0.62, lengthScale) * mix(1.0, 0.75, hero);
    float dash = smoothstep(0.08, 0.92, fract(cellUV.y * dashFreq + random(cellId) * 2.0));
    float dist = abs(cellUV.x + curve);
    float core = smoothstep(width, 0.0, dist) * dash;

    float taperTop = mix(0.28, 0.42, lengthScale) * mix(1.0, 1.35, hero);
    float taper = smoothstep(-0.5 * lengthScale, -0.1, cellUV.y) * (1.0 - smoothstep(taperTop, taperTop + 0.12, cellUV.y));
    core *= taper;

    float surfaceFade = smoothstep(uSurfaceBandHalfHeight * 2.2, uSurfaceBandHalfHeight * 5.5, depthBelowSurface);
    float bottomFade = smoothstep(0.03, 0.12, depth);
    float centerBias = 1.0 - smoothstep(0.0, 0.38, abs(waterUV.x - 0.5) * mix(1.05, 1.55, layerSeed));
    core *= surfaceFade * bottomFade * mix(0.84, 1.0, centerBias);

    float layerOpacity = streakOpacity * mix(0.58, 1.0, layerSeed) * mix(1.0, 1.55, hero);
    return core * layerOpacity;
  }

  vec3 applyRisingStreaks(vec3 color, vec2 waterUV, float depth, float depthBelowSurface) {
    float visual = clamp(uVisualIntensity, 0.0, 1.0);
    float streakOpacity = mix(uRiseStreakIdleOpacity, uRiseStreakActiveOpacity, visual);
    float riseSpeed = mix(
      uRiseStreakIdleSpeed,
      uInternalCurrentSpeed * uRiseStreakActiveSpeedScale + speed * 2.0,
      visual
    );

    float back = risingStreakLayer(waterUV, depth, depthBelowSurface, 0.12, riseSpeed, streakOpacity, 1.0, 0.78);
    float mid = risingStreakLayer(waterUV, depth, depthBelowSurface, 0.48, riseSpeed, streakOpacity * 1.05, 1.35, 1.0);
    float fore = risingStreakLayer(waterUV, depth, depthBelowSurface, 0.86, riseSpeed, streakOpacity * 0.88, 1.0, 1.28);
    float longLayer = risingStreakLayer(waterUV, depth, depthBelowSurface, 0.64, riseSpeed, streakOpacity * 0.92, 1.95, 1.15);

    vec3 streakTint = mix(uWaterHighlight, uWaterColorSurface, 0.38);
    vec3 heroTint = mix(streakTint, vec3(0.74, 0.94, 1.0), 0.42);
    color += streakTint * back * 0.52;
    color += streakTint * mid * 0.88;
    color += heroTint * fore * 1.08;
    color += heroTint * longLayer * 0.95;
    return color;
  }

  float bubbleInCell(
    vec2 cellId,
    vec2 fragPx,
    vec2 cellSize,
    float spawnThreshold,
    float bubbleOpacity,
    float visual
  ) {
    float rSeed = random(cellId * 3.17 + 41.2);
    if (rSeed < spawnThreshold) {
      return 0.0;
    }

    float sizeT = random(cellId * 13.97 + 8.42);
    float radiusPx = mix(uBubbleMinRadiusPx, uBubbleMaxRadiusPx, sizeT);
    float r1 = random(cellId * 7.31 + 1.23);
    float r2 = random(cellId * 11.71 + 4.56);
    vec2 centerPx = vec2(
      (0.2 + 0.6 * r1) * cellSize.x,
      (0.12 + 0.72 * r2) * cellSize.y
    );
    centerPx.x += sin(iTime * mix(1.0, 2.0, visual) + r1 * 12.0) * mix(2.0, 3.5, visual);

    vec2 cellOrigin = cellId * cellSize;
    vec2 diff = fragPx - (cellOrigin + centerPx);
    float dist = length(diff);

    float ring = smoothstep(radiusPx + 1.4, radiusPx * 0.82, dist) *
      (1.0 - smoothstep(radiusPx * 0.58, radiusPx * 0.22, dist));
    float core = (1.0 - smoothstep(radiusPx * 0.42, 0.0, dist)) * 0.22;
    float highlight = (1.0 - smoothstep(0.0, radiusPx * 0.35, length(diff - vec2(-radiusPx * 0.28, radiusPx * 0.26)))) * ring;
    return (ring * 0.82 + core + highlight * 0.35) * bubbleOpacity;
  }

  vec3 applyRisingBubbles(
    vec3 color,
    vec2 fragCoord,
    float localY,
    float depthBelowSurface,
    float visual
  ) {
    float bubbleOpacity = mix(uBubbleIdleOpacity, uBubbleActiveOpacity, visual);
    float spawnThreshold = mix(uBubbleIdleSpawnThreshold, uBubbleActiveSpawnThreshold, visual);
    float riseSpeed = bubbleRiseSpeed(visual);
    vec2 localPx = vec2(
      fragCoord.x + containerWidth * 0.5,
      fragCoord.y + containerHeight * 0.5
    );
    vec2 cellSize = vec2(
      mix(uBubbleCellWidthPx, uBubbleCellWidthPx * 0.82, visual),
      mix(uBubbleCellHeightPx, uBubbleCellHeightPx * 0.86, visual)
    );
    float riseFactor = mix(uBubbleRiseIdleFactor, uBubbleRiseActiveFactor, visual);
    vec2 scrollPx = localPx + vec2(0.0, iTime * riseSpeed * containerHeight * riseFactor);
    vec2 baseCell = floor(scrollPx / cellSize);

    float bubbleMask = 0.0;
    bubbleMask = max(bubbleMask, bubbleInCell(baseCell, scrollPx, cellSize, spawnThreshold, bubbleOpacity, visual));
    bubbleMask = max(bubbleMask, bubbleInCell(baseCell + vec2(1.0, 0.0), scrollPx, cellSize, spawnThreshold, bubbleOpacity, visual));
    bubbleMask = max(bubbleMask, bubbleInCell(baseCell + vec2(0.0, 1.0), scrollPx, cellSize, spawnThreshold, bubbleOpacity, visual));
    bubbleMask = max(bubbleMask, bubbleInCell(baseCell + vec2(1.0, 1.0), scrollPx, cellSize, spawnThreshold, bubbleOpacity, visual));
    bubbleMask = max(bubbleMask, bubbleInCell(baseCell + vec2(-1.0, 0.0), scrollPx, cellSize, spawnThreshold, bubbleOpacity, visual));
    bubbleMask = max(bubbleMask, bubbleInCell(baseCell + vec2(0.0, -1.0), scrollPx, cellSize, spawnThreshold, bubbleOpacity, visual));

    float verticalFade = smoothstep(0.05, 0.18, localY) * (1.0 - smoothstep(0.68, 0.92, localY));
    bubbleMask *= verticalFade;
    bubbleMask *= smoothstep(uSurfaceBandHalfHeight * 1.8, uSurfaceBandHalfHeight * 4.0, depthBelowSurface);

    vec3 bubbleFill = mix(uWaterColorSurface, uWaterHighlight, 0.42);
    vec3 bubbleRim = mix(uWaterHighlight, vec3(0.78, 0.94, 1.0), 0.35);
    color = mix(color, bubbleFill, bubbleMask * 0.55);
    color += bubbleRim * bubbleMask * 0.42;
    return color;
  }

  vec3 renderWaterBody(
    vec2 containerUV,
    vec2 uv,
    vec2 fragCoord,
    float surfaceY,
    float finalSurface,
    float centeredNorm,
    float activeBandMask,
    float softGap,
    float surgeEnergy,
    float flowVelocity,
    float directionalFlowBoost
  ) {
    float depth = clamp(containerUV.y / max(surfaceY, 0.0001), 0.0, 1.0);
    float depthBelowSurface = max(0.0, surfaceY - containerUV.y);

    vec2 flowUV = uv;
    float visual = clamp(uVisualIntensity, 0.0, 1.0);
    float idleMotion = (1.0 - visual) * uInternalCurrentOpacity;
    float gameplayMotion = visual * (0.45 + 0.35 * surgeEnergy);
    flowUV.x += flowVelocity * depth * (0.05 + 0.06 * surgeEnergy);
    flowUV.y -= iTime * speed * (gameplayMotion + idleMotion * 0.25);

    vec3 flowColor = sampleWaterDepthGradient(depth, depthBelowSurface);

    float wallFactor = smoothstep(0.0, 0.5, abs(containerUV.x - 0.5) * 2.0);
    flowColor *= 1.0 - wallFactor * uWallDarkening * mix(0.55, 1.0, visual);

    float subsurfaceBandHeight = max(0.04, uSurfaceBandHalfHeight * 1.6);
    float nearSurfaceMask = 1.0 - smoothstep(0.0, subsurfaceBandHeight, depthBelowSurface);
    float subsurfaceCurveMask = nearSurfaceMask * visual * activeBandMask * softGap;
    flowColor += subsurfaceCurveMask * vec3(0.045, 0.06, 0.08) * (1.0 + surgeEnergy * 0.6);

    flowColor = applyInternalSoftDetail(flowColor, flowUV, depth, idleMotion);
    flowColor = applyRisingStreaks(flowColor, uv, depth, depthBelowSurface);
    flowColor = applySurfaceLip(flowColor, depthBelowSurface);

    float waterHeight = max(finalSurface, 0.0001);
    float localY = clamp(containerUV.y / waterHeight, 0.0, 1.0);
    flowColor = applyRisingBubbles(flowColor, fragCoord, localY, depthBelowSurface, visual);

    return flowColor;
  }
`;
