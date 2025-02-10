import { WaterSurfacePoint } from '@/types/globals';
import { IWave, IWaveSystemProps } from '../Wave/types';
import {
  getDecayFactorAtDistance,
  getDistance,
  getSurfaceAtPosition,
  getXAcceleration,
} from '../Wave/worklets';
import { Sea } from './Sea';
import { SeaSystemProps } from './types';

export const getDefaultLayer = (
  sea: SeaSystemProps,
  layerIndex?: number
): SeaSystemProps => {
  'worklet';
  let layer: SeaSystemProps =
    sea.layersCount > 1 ? sea.layers[sea.mainLayerIndex] : sea;
  if ((!!layerIndex || layerIndex === 0) && sea.layersCount > 0)
    layer = sea.layers[layerIndex];
  return layer;
};

export const getOriginalWaterSurfaceY = (
  sea: SeaSystemProps,
  layerIndex?: number
): number => {
  'worklet';
  const layer: SeaSystemProps = getDefaultLayer(sea, layerIndex);
  return layer.y - layer.height / 2;
};

export const getWaterSurfaceAndMaxHeightAtPoint = (
  sea: SeaSystemProps,
  x: number,
  layerIndex?: number
): WaterSurfacePoint => {
  'worklet';
  const layer: SeaSystemProps = getDefaultLayer(sea, layerIndex);
  let surface = getOriginalWaterSurfaceY(sea, layerIndex);
  let maxWaveHeight = 0;
  layer.waves.forEach((wave) => {
    const waveSurface = getSurfaceAtPosition({ wave, x });
    surface += waveSurface;
    if (waveSurface > maxWaveHeight) maxWaveHeight = waveSurface;
  });
  return { x, y: surface, maxWaveHeight: maxWaveHeight };
};

export const getForceAtPoint = (
  waves: IWave['props'][],
  x: number
): Matter.Vector => {
  'worklet';
  const force = { x: 0, y: 0 };
  waves.forEach((wave, index) => {
    if (index !== 0) {
      if (wave.value.isFlowing.value) {
        const distance = getDistance(wave, x);
        const decayFactor = getDecayFactorAtDistance(distance);

        const xAcceleration = getXAcceleration(wave);

        const yForce =
          ((wave.value.maxAmplitude.value *
            decayFactor *
            Math.sin(distance * wave.value.frequency.value)) /
            0.2) *
          0.01 *
          0.1;
        if (yForce > 0) force.y -= yForce;
        force.x += xAcceleration * decayFactor * 0.001 * 0.01;
      }
    }
  });
  return force;
};
