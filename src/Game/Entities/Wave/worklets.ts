import { ICanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { IWave, IWaveSystemProps, WaveConfig } from './types';
import { WaveSource } from '../Sea/types';
import { runOnJS, SharedValue } from 'react-native-reanimated';

export const getDistance = (wave: IWave['props'], x: number): number => {
  'worklet';
  let xPosition = x / (wave.value.dimensions.width || 1);

  xPosition = xPosition + wave.value.time.value * wave.value.speed.value * 0.4;
  let distance =
    xPosition - wave.value.x.value / (wave.value.dimensions.width || 1);
  return distance;
};

export const getDecayFactorAtDistance = (distance: number): number => {
  'worklet';
  return Math.exp(-8 * Math.abs(distance));
};

export const getSurfaceAtPosition = ({
  wave,
  x,
}: {
  wave: IWave['props'];
  x: number;
}): number => {
  'worklet';
  if (!wave.value.dimensions) return 0;

  let distance = getDistance(wave, x);
  let decayFactor = 1;
  if (wave.value.source !== WaveSource.FLOW)
    decayFactor = getDecayFactorAtDistance(distance);
  let phase = 0;
  if (wave.value.source !== WaveSource.FLOW) phase = wave.value.phase.value;
  const surface =
    -wave.value.amplitude.value *
    0.05 *
    decayFactor *
    Math.sin(distance * wave.value.frequency.value * 0.5 + 0.5);
  return surface * (wave.value.dimensions.height || 1);
};

export const getXAcceleration = (wave: IWave['props']): number => {
  'worklet';
  return wave.value.speed.value - wave.value.prevSpeed;
};

export const resetWave = (
  wave: SharedValue<IWaveSystemProps>,
  config: WaveConfig
) => {
  'worklet';
  wave.value.initialConfig = config;
  wave.value.isFlowing.value = config.isFlowing;
  wave.value.dimensions = config.dimensions;

  wave.value.x.value = config.x;
  wave.value.maxAmplitude.value = config.initialAmplitude;
  wave.value.amplitude.value =
    config.source === WaveSource.FLOW ? config.initialAmplitude : 0.006;

  wave.value.frequency.value = config.initialFrequency;
  // wave.value.phase = config.initialPhase ?? 0;
  wave.value.time.value = config.initialTime ?? 0;
  wave.value.speed.value = config.speed ?? 0.01;
  wave.value.source = config.source;

  wave.value.lastForceTime.value = 0;
};

export const updateWave = (
  wave: SharedValue<IWaveSystemProps>,
  deltaTime?: number
) => {
  'worklet';
  if (!deltaTime) return;
  if (!wave.value) return;
  if (
    !wave.value.isFlowing.value ||
    !wave.value.time ||
    !wave.value.amplitude ||
    !wave.value.maxAmplitude ||
    !wave.value.frequency ||
    !wave.value.speed ||
    !wave.value.source ||
    !wave.value.lastForceTime
  )
    return;

  // Convert deltaTime to seconds
  const deltaSeconds = deltaTime / 1000;

  // Update time
  wave.value.time.value += deltaSeconds;

  if (wave.value.source === WaveSource.FLOW) return;

  // Initial quick rise phase for amplitude
  const riseTime = 0.05;

  // Calculate time since last force application
  const timeSinceLastForce =
    wave.value.time.value - wave.value.lastForceTime.value;

  // Dynamic decay factors based on recent activity
  const baseDecay = 0.98;
  const activeDecay = 0.995; // Slower decay when recently forced
  const decayFactor = timeSinceLastForce < 0.01 ? activeDecay : baseDecay;

  if (wave.value.time.value < riseTime) {
    const progress = wave.value.time.value / riseTime;
    wave.value.amplitude.value =
      1 + wave.value.maxAmplitude.value * Math.pow(progress, 3);
  } else {
    wave.value.amplitude.value *= decayFactor;
  }

  if (timeSinceLastForce > 0.02) {
    // Only decay if not recently forced
    if (
      wave.value.time.value > riseTime / 3 &&
      wave.value.frequency.value < 60
    ) {
      wave.value.frequency.value *= 1.01;
    }
    if (
      wave.value.time.value > riseTime / 3 &&
      Math.abs(wave.value.speed.value) < 1.1
    ) {
      wave.value.prevSpeed = wave.value.speed.value;
      wave.value.speed.value *= 1.01;
    }
  }
  if (wave.value.amplitude.value < 1 && wave.value.source === WaveSource.TOUCH)
    resetWave(wave, {
      dimensions: {
        width: wave.value.dimensions.width,
        height: wave.value.dimensions.height,
      },
      source: WaveSource.TOUCH,
      x: 0,
      initialAmplitude: 0,
      initialFrequency: 0,
      speed: 0,
      isFlowing: false,
    });
};
