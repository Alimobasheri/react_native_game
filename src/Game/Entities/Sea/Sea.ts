import { IWave, WaveConfig } from '../Wave/types';
import {
  ISea,
  InitiateWaveConfig,
  SeaConfig,
  SurfacePointMap,
  WaveSource,
} from './types';
import { WaterSurfacePoint } from '@/types/globals';
import { Wave } from '@/Game/Entities/Wave/Wave';
import {
  layerFlowConfigs,
  WATER_GRADIENT_COLORS,
} from '@/constants/waterConfigs';
import Matter from 'matter-js';
import { makeMutable, runOnUI, SharedValue } from 'react-native-reanimated';
import React from 'react';
import { EventDispatcher } from '@/containers/ReactNativeSkiaGameEngine';
import { SEA_ADD_WAVE_EVENT } from '@/constants/events';

export class Sea implements ISea {
  protected _x: number;
  protected _y: number;
  protected _width: number;
  protected _height: number;
  protected _windowWidth: number;
  protected _windowHeight: number;
  protected _startingX: number = 0;
  protected _startingY: number = 0;
  protected _waves: IWave[] = [];
  protected _waterSurfacePoints: SurfacePointMap = new Map<
    number,
    WaterSurfacePoint
  >();
  protected _layers: Sea[] = [];
  protected _layersCount: number = 1;
  protected _mainLayerIndex: number = 0;
  public gradientColors: string[] | undefined;
  protected _emitEvent?: EventDispatcher['emitEvent'];

  constructor({
    x,
    y,
    width,
    height,
    windowWidth,
    windowHeight,
    layersCount,
    mainLayerIndex,
    gradientColors,
    flowAmplitude = 1,
    flowFrequency = 1,
    flowSpeed = 1,
    emitEvent,
  }: SeaConfig) {
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    this._windowWidth = windowWidth;
    this._windowHeight = windowHeight;
    this.gradientColors = gradientColors;
    this._emitEvent = emitEvent;
    if (!!layersCount) this._layersCount = layersCount;
    if (typeof mainLayerIndex !== 'undefined')
      this._mainLayerIndex = mainLayerIndex;
    this.setBounds();
    if (this._layersCount > 1) {
      this.createLayers();
    } else {
      this._waves.push(
        new Wave({
          isFlowing: true,
          dimensions: { width: this._windowWidth, height: this._windowHeight },
          source: WaveSource.FLOW,
          x: this.startingX,
          initialAmplitude: flowAmplitude,
          initialFrequency: flowFrequency,
          speed: flowSpeed,
        })
      );
      this._waves.push(
        new Wave({
          isFlowing: false,
          dimensions: { width: this._windowWidth, height: this._windowHeight },
          source: WaveSource.TOUCH,
          x: 0,
          initialAmplitude: 0,
          initialFrequency: 0,
          speed: 0,
        })
      );
      this._layers[0] = this;
    }
    // this.setWaterSurfacePoints();
  }

  get width(): number {
    return this._width;
  }
  get height(): number {
    return this._height;
  }
  get startingX(): number {
    return this._startingX;
  }
  get startingY(): number {
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
      layer._waves.forEach(
        (
          {
            isFlowing,
            time,
            source,
            amplitude,
            maxAmplitude,
            frequency,
            speed,
            update,
          },
          idx
        ) => {
          const onExpire = () => {
            layer._waves[idx].reset({
              dimensions: {
                width: this._windowWidth,
                height: this._windowHeight,
              },
              source: WaveSource.TOUCH,
              x: 0,
              initialAmplitude: 0,
              initialFrequency: 0,
              speed: 0,
              isFlowing: false,
            });
          };
          runOnUI(update)(
            {
              isFlowing,
              time,
              source,
              amplitude,
              maxAmplitude,
              frequency,
              speed,
            },
            deltaTime,
            onExpire
          );
        }
      );
      // layer.setWaterSurfacePoints();
      // layer._waves = layer._waves.filter(
      //   (wave) => !wave.isExpired() || wave.source === WaveSource.FLOW
      // );
    });
  }

  protected createLayers(): void {
    for (let i = 0; i < this._layersCount; i++) {
      const gradientColors =
        WATER_GRADIENT_COLORS[i % WATER_GRADIENT_COLORS.length];
      const flowConfig = layerFlowConfigs[i];
      const layerConfig: SeaConfig = {
        x: this._x,
        y: this._y + this._height - (this._height / this._layersCount) * i,
        width: this._width,
        height: this._height / this._layersCount,
        gradientColors,
        flowAmplitude: flowConfig.flowAmplitude,
        flowFrequency: flowConfig.flowFrequency,
        flowSpeed: flowConfig.flowSpeed,
        windowWidth: this._windowWidth,
        windowHeight: this._windowHeight,
      };
      const layer = new Sea(layerConfig);
      this._layers.push(layer);
    }
  }
  protected setBounds(): void {
    this._startingX = this._x - this._width / 2;
    this._startingY = this._y - this._height / 2;
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
      isFlowing: true,
      dimensions: { width: this._windowWidth, height: this._windowHeight },
      x,
      initialAmplitude: amplitude,
      initialFrequency: frequency,
      initialPhase: phase,
      initialTime: time,
      source,
      speed,
    };
    const touchWave = layer._waves[1];
    touchWave.reset(waveConfig);
    if (this._emitEvent)
      this._emitEvent(SEA_ADD_WAVE_EVENT(layer, layer.waves));
    return touchWave;
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
        const maxAmplitude = wave.maxAmplitude.value;
        const distance = wave.getDistance(x);
        const decayFactor = wave.getDecayFactorAtDistance(distance);

        const xAcceleration = wave.getXAcceleration();

        const yForce =
          ((maxAmplitude *
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
    const startingX = layer._x - layer._width / 2;
    const endingX = layer._x + layer._width / 2;
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
    return layer._y - layer._height / 2;
  }

  getDefaultLayer(layerIndex?: number): Sea {
    let layer: Sea =
      this._layersCount > 1 ? this._layers[this._mainLayerIndex] : this;
    if ((!!layerIndex || layerIndex === 0) && this._layersCount > 0)
      layer = this._layers[layerIndex];
    return layer;
  }
}
