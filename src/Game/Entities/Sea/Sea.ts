import { SeaView } from '@/components/SeaView';
import { IWave, WaveConfig } from '../Wave/types';
import {
  ISea,
  InitiateWaveConfig,
  SeaConfig,
  SurfacePointMap,
  WaveSource,
} from './types';
import { Point2D, WaterSurfacePoint } from '@/types/globals';
import { Wave } from '@/Game/Entities/Wave/Wave';
import { WATER_GRADIENT_COLORS } from '@/constants/waterConfigs';
import Matter from 'matter-js';
import { SharedValue } from 'react-native-reanimated';

export class Sea implements ISea {
  protected _x: SharedValue<number>;
  protected _y: SharedValue<number>;
  protected _width: SharedValue<number>;
  protected _height: SharedValue<number>;
  protected _windowWidth: SharedValue<number>;
  protected _windowHeight: SharedValue<number>;
  protected _startingX: SharedValue<number>;
  protected _startingY: SharedValue<number>;
  protected _waves: IWave[] = [];
  protected _waterSurfacePoints: SurfacePointMap = new Map<
    number,
    WaterSurfacePoint
  >();
  protected _layers: Sea[] = [];
  protected _layersCount: number = 1;
  protected _mainLayerIndex: number = 0;
  public gradientColors: string[] | undefined;

  constructor({
    x,
    y,
    width,
    height,
    windowWidth,
    windowHeight,
    layersCount,
    layersConfigs,
    mainLayerIndex,
    gradientColors,
    flowAmplitude,
    flowFrequency,
    flowSpeed,
    flowPhase,
    flowTime,
    bounds,
    dynamicWave,
  }: SeaConfig) {
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    this._windowWidth = windowWidth;
    this._windowHeight = windowHeight;
    this.gradientColors = gradientColors;
    if (!!layersCount) this._layersCount = layersCount;
    this._startingX = bounds.startingX;
    this._startingY = bounds.startingY;
    if (typeof mainLayerIndex !== 'undefined')
      this._mainLayerIndex = mainLayerIndex;
    if (this._layersCount > 1 && layersConfigs) {
      this.createLayers({ layersConfigs: layersConfigs });
    } else {
      this.waves.push(
        new Wave({
          dimensions: {
            width: this._windowWidth.value,
            height: this._windowHeight.value,
          },
          source: WaveSource.FLOW,
          x: this._x,
          initialAmplitude: flowAmplitude,
          initialFrequency: flowFrequency,
          speed: flowSpeed,
          initialPhase: flowPhase,
          initialTime: flowTime,
        })
      );
      this.waves.push(dynamicWave);
      this._layers[0] = this;
    }
    // this.setWaterSurfacePoints();
  }

  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  get startingX() {
    return this._startingX;
  }
  get startingY() {
    return this._startingY;
  }

  get waves(): IWave[] {
    return this._waves;
  }

  get waterSurfacePoints(): SurfacePointMap {
    return this._waterSurfacePoints;
  }

  get layers(): Sea[] {
    return this._layers;
  }

  get mainLayerIndex(): number {
    return this._mainLayerIndex;
  }

  update(deltaTime?: number | undefined): void {
    this._layers.forEach((layer, idx) => {
      layer._waves.forEach((wave) => wave.update(deltaTime));
      // layer.setWaterSurfacePoints();
      // layer._waves = layer._waves.filter(
      //   (wave) => !wave.isExpired() || wave.source === WaveSource.FLOW
      // );
    });
  }

  protected createLayers({
    layersConfigs,
  }: {
    layersConfigs: SeaConfig[];
  }): void {
    for (let i = 0; i < this._layersCount; i++) {
      const flowConfig = layersConfigs[i];
      const gradientColors =
        WATER_GRADIENT_COLORS[i % WATER_GRADIENT_COLORS.length];
      const layerConfig: SeaConfig = {
        x: this._x,
        y: flowConfig.bounds.startingY,
        width: this._width,
        height: flowConfig.height,
        gradientColors,
        flowAmplitude: flowConfig.flowAmplitude,
        flowFrequency: flowConfig.flowFrequency,
        flowSpeed: flowConfig.flowSpeed,
        flowPhase: flowConfig.flowPhase,
        flowTime: flowConfig.flowTime,
        bounds: flowConfig.bounds,
        windowWidth: this._windowWidth,
        windowHeight: this._windowHeight,
        dynamicWave: flowConfig.dynamicWave,
      };
      const layer = new Sea(layerConfig);
      this._layers.push(layer);
    }
  }

  initiateWave({
    x,
    amplitude,
    frequency,
    phase,
    time,
    speed,
    source,
    layerIndex,
  }: InitiateWaveConfig): IWave {
    const layer: Sea = this.getDefaultLayer(layerIndex);
    const waveConfig: WaveConfig = {
      dimensions: {
        width: this._windowWidth.value,
        height: this._windowHeight.value,
      },
      x,
      initialAmplitude: amplitude,
      initialFrequency: frequency,
      initialPhase: phase,
      initialTime: time,
      source,
      speed,
    };
    const wave = new Wave(waveConfig);
    layer._waves.push(wave);
    return wave;
  }
  getWaterSurfaceAndMaxHeightAtPoint(
    x: number,
    layerIndex?: number
  ): WaterSurfacePoint {
    const layer: Sea = this.getDefaultLayer(layerIndex);
    let surface = this.getOriginalWaterSurfaceY();
    let maxWaveHeight = 0;
    layer._waves.forEach((wave) => {
      const waveSurface = wave.getSurfaceAtPosition(x);
      surface += waveSurface;
      if (waveSurface > maxWaveHeight) maxWaveHeight = waveSurface;
    });
    return { x, y: surface, maxWaveHeight };
  }
  getForceAtPoint(x: number, layerIndex?: number): Matter.Vector {
    const layer: Sea = this.getDefaultLayer(layerIndex);
    const force = Matter.Vector.create(0, 0);
    layer._waves.forEach((wave, index) => {
      if (index !== 0) {
        const maxAmplitude = wave.maxAmplitude;
        const distance = wave.getDistance(x);
        const decayFactor = wave.getDecayFactorAtDistance(distance);

        const xAcceleration = wave.getXAcceleration();

        const yForce =
          ((maxAmplitude.value *
            decayFactor *
            Math.sin(distance * wave.frequency.value)) /
            0.2) *
          0.01 *
          0.01;
        if (yForce > 0) force.y -= yForce;
        force.x += xAcceleration * decayFactor * 0.001 * 0.01;
      }
    });
    return force;
  }
  getWaterSurfacePoints(layerIndex?: number): SurfacePointMap {
    const layer: Sea = this.getDefaultLayer(layerIndex);
    const surfacePoints: SurfacePointMap = new Map<number, WaterSurfacePoint>();
    const startingX = layer._x.value - layer._width.value / 2;
    const endingX = layer._x.value + layer._width.value / 2;
    for (let i = startingX; i <= endingX; i++) {
      const surfacePoint = layer.getWaterSurfaceAndMaxHeightAtPoint(i);
      surfacePoints.set(i, {
        x: i,
        y: surfacePoint.y,
        maxWaveHeight: surfacePoint.maxWaveHeight,
      });
    }
    return surfacePoints;
  }
  protected setWaterSurfacePoints(): void {
    if (this._layersCount > 1) return;
    const surfacePoints: SurfacePointMap = this.getWaterSurfacePoints();
    this._waterSurfacePoints = surfacePoints;
  }
  public getWaterSlopeAtPoint(x: number, layerIndex?: number): number {
    const layer: Sea = this.getDefaultLayer(layerIndex);
    let slope = 0;
    layer._waves.forEach((wave) => {
      slope += wave.getSurfaceAtPosition(x);
    });
    return slope;
  }
  getOriginalWaterSurfaceY(layerIndex?: number): number {
    const layer: Sea = this.getDefaultLayer(layerIndex);
    return layer._y.value - layer._height.value / 2;
  }

  getDefaultLayer(layerIndex?: number): Sea {
    let layer: Sea =
      this._layersCount > 1 ? this._layers[this._mainLayerIndex] : this;
    if ((!!layerIndex || layerIndex === 0) && this._layersCount > 0)
      layer = this._layers[layerIndex];
    return layer;
  }
  renderer = SeaView;
}
