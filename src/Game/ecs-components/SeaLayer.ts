export enum WaveSource {
  FLOW = 'FLOW',
  TOUCH = 'TOUCH',
}

export type WaveData = {
  isFlowing: boolean;
  x: number;
  amplitude: number;
  maxAmplitude: number;
  frequency: number;
  speed: number;
  time: number;
  source: WaveSource;
  prevSpeed: number;
  lastForceTime: number;
  forceSmoothingFactor: number;
  dimensions: { width: number; height: number };
};

export const createWave = (config: {
  isFlowing: boolean;
  x: number;
  amplitude: number;
  frequency: number;
  speed: number;
  time?: number;
  source: WaveSource;
  dimensions: { width: number; height: number };
}): WaveData => {
  'worklet';
  return {
    isFlowing: config.isFlowing,
    x: config.x,
    amplitude: config.amplitude,
    maxAmplitude: config.amplitude,
    frequency: config.frequency,
    speed: config.speed,
    time: config.time ?? 0,
    source: config.source,
    prevSpeed: 0,
    lastForceTime: 0,
    forceSmoothingFactor: 0.2,
    dimensions: config.dimensions,
  };
};

export const SeaLayerComponentName = 'SeaLayer';

export type SeaLayerComponentData = {
  x: number;
  y: number;
  width: number;
  height: number;
  windowWidth: number;
  windowHeight: number;
  layerIndex: number;
  startingX: number;
  startingY: number;
  gradientColors: string[];
  flowAmplitude: number;
  flowFrequency: number;
  flowSpeed: number;
  isMainLayer: boolean;
  waves: WaveData[];
};

export const createSeaLayerComponent = (data: SeaLayerComponentData) => {
  'worklet';
  return {
    name: SeaLayerComponentName,
    data,
  };
};
