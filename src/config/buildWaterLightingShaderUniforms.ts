import { swimmerWaterLightingTuning } from './swimmerWaterLightingTuning';
import {
  WATER_COLOR_BASE_RGB,
  WATER_COLOR_DEEP_RGB,
  WATER_COLOR_HIGHLIGHT_RGB,
  WATER_COLOR_MID_RGB,
} from './swimmerWaterLightingTuning';

/** Shader uniform defaults derived from idle/general water lighting tuning. */
export function buildWaterLightingShaderUniforms(): Record<
  string,
  number | [number, number, number]
> {
  const t = swimmerWaterLightingTuning;
  return {
    uVisualIntensity: 0,
    uWaterColorSurface: WATER_COLOR_BASE_RGB,
    uWaterColorMid: WATER_COLOR_MID_RGB,
    uWaterColorDeep: WATER_COLOR_DEEP_RGB,
    uWaterHighlight: WATER_COLOR_HIGHLIGHT_RGB,
    uSurfaceHighlightThickness: t.surfaceHighlightThickness,
    uInternalCurrentOpacity: t.internalCurrentOpacity,
    uInternalCurrentSpeed: t.internalCurrentSpeed,
    uWallDarkening: t.wallDarkeningStrength,
    uIdleMainWaveAmplitude: t.idleWaveAmplitude,
    uIdleMainWaveSpeed: t.idleWaveSpeed,
    uIdleMainWaveSpatialFreq: t.idleWaveSpatialFreq,
    uIdleSecondaryWaveAmplitude: t.secondaryWaveAmplitude,
    uIdleSecondaryWaveSpeed: t.secondaryWaveSpeed,
    uIdleSecondaryWaveSpatialFreq: t.secondaryWaveSpatialFreq,
    uIdleMaxCombinedAmplitude: t.idleMaxCombinedAmplitude,
    uIdleBreathingAmount: t.idleBreathingAmount,
    uIdleBreathingSpeed: t.idleBreathingSpeed,
    uInternalShapeOpacity: t.internalShapeOpacity,
    uRiseStreakIdleOpacity: t.riseStreakIdleOpacity,
    uRiseStreakActiveOpacity: t.riseStreakActiveOpacity,
    uRiseStreakIdleSpeed: t.riseStreakIdleSpeed,
    uRiseStreakActiveSpeedScale: t.riseStreakActiveSpeedScale,
    uRiseStreakLongChance: t.riseStreakLongChance,
    uBubbleIdleOpacity: t.bubbleIdleOpacity,
    uBubbleActiveOpacity: t.bubbleActiveOpacity,
    uBubbleIdleSpawnThreshold: t.bubbleIdleSpawnThreshold,
    uBubbleActiveSpawnThreshold: t.bubbleActiveSpawnThreshold,
    uBubbleCellWidthPx: t.bubbleCellWidthPx,
    uBubbleCellHeightPx: t.bubbleCellHeightPx,
    uBubbleMinRadiusPx: t.bubbleMinRadiusPx,
    uBubbleMaxRadiusPx: t.bubbleMaxRadiusPx,
    uBubbleRiseIdleFactor: t.bubbleRiseIdleFactor,
    uBubbleRiseActiveFactor: t.bubbleRiseActiveFactor,
    uBubbleRiseFromWaterSpeed: t.bubbleRiseFromWaterSpeed,
  };
}
