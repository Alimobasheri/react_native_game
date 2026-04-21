import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

export const WaterComponentName = 'Water';

export type WaterComponentData = {
  containerEntityId: number; // Reference to container entity
  baseSpeed: number;
  raisingSpeed: number; // Pixels per second - speed at which water rises
  centerRowEntity?: number;
  lastCenterRowEntity?: number; // persisted to detect row transitions for surge pulse
  forceDirection?: number;
  flowDirection?: number; // Smoothed directional flow used by shader
  currentGapStartNorm?: number; // 0..1 gap start in container UV X
  currentGapEndNorm?: number; // 0..1 gap end in container UV X
  prevGapStartNorm?: number; // previous row gap start for cross-fade
  prevGapEndNorm?: number; // previous row gap end for cross-fade
  gapBlend?: number; // 0..1 blend from prev gap to current gap
  gapCenterNorm?: number; // 0..1 center of current gap span
  gapWidthNorm?: number; // 0..1 width of current gap span
  surfaceBandCenterY?: number; // 0..1 (bottom=0, top=1)
  surfaceBandHalfHeight?: number; // 0..1
  surgePhase?: number; // 0..1 short pulse triggered on row change
  peakHeight?: number; // crest height boost in UV units
  peakSharpness?: number; // crest concentration
  troughDepth?: number; // side trough depth in UV units
  flowWaveSpeedScale?: number; // horizontal wave advection scale
  flowVelocity?: number; // inertial lateral velocity in normalized range (-1..1)
  flowOffset?: number; // integrated lateral displacement in normalized gap space
  surgeEnergy?: number; // decaying push energy used by visuals (0..1)
  calmness?: number; // calm-state factor (0..1)
  surfaceCurveCenterNorm?: number; // smoothed center for surface profile (0..1)
  surfaceCurveAmp?: number; // smoothed center-curve amplitude in UV units
  surfaceCurveTilt?: number; // smoothed directional tilt in UV units
};

export const createWaterComponent = (
  data: WaterComponentData
): Component<WaterComponentData> => {
  'worklet';
  return {
    name: WaterComponentName,
    data,
  };
};
