import { SeaView } from "@/components/SeaView";
import { IWave, WaveConfig } from "../Wave/types";
import {
  ISea,
  InitiateWaveConfig,
  SeaConfig,
  SurfacePointMap,
  WaveSource,
} from "./types";
import { Point2D, WaterSurfacePoint } from "@/types/globals";
import { Wave } from "@/Game/Entities/Wave/Wave";

export class Sea implements ISea {
  protected _x: number;
  protected _y: number;
  protected _width: number;
  protected _height: number;
  protected _startingX: number = 0;
  protected _startingY: number = 0;
  protected _waves: IWave[] = [];
  protected _waterSurfacePoints: SurfacePointMap = new Map<
    number,
    WaterSurfacePoint
  >();

  constructor({ x, y, width, height }: SeaConfig) {
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    this.setBounds();
    this.setWaterSurfacePoints();
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

  update(currentFrame?: number | undefined): void {
    this._waves.forEach((wave) => wave.update(currentFrame));
    this.setWaterSurfacePoints();
    this._waves = this._waves.filter((wave) => !wave.isExpired());
  }
  protected setBounds(): void {
    this._startingX = this._x - this._width / 2;
    this._startingY = this._y + this._height / 2;
  }
  initiateWave({
    x,
    amplitude,
    frequency,
    phase,
    time,
    source,
  }: InitiateWaveConfig): IWave {
    const waveConfig: WaveConfig = {
      x,
      initialAmplitude: amplitude,
      initialFrequency: frequency,
      initialPhase: phase,
      initialTime: time,
    };
    const wave = new Wave(waveConfig);
    this._waves.push(wave);
    return wave;
  }
  getWaterSurfaceAndMaxHeightAtPoint(x: number): WaterSurfacePoint {
    let surface = this.getOriginalWaterSurfaceY();
    let maxWaveHeight = 0;
    this._waves.forEach((wave) => {
      const waveSurface = wave.getSurfaceAtPosition(x);
      surface += waveSurface;
      if (waveSurface > maxWaveHeight) maxWaveHeight = waveSurface;
    });
    return { x, y: surface, maxWaveHeight };
  }
  getWaterSurfacePoints(): SurfacePointMap {
    const surfacePoints: SurfacePointMap = new Map<number, WaterSurfacePoint>();
    const startingX = this._x - this._width / 2;
    const endingX = this._x + this._width / 2;
    for (let i = startingX; i <= endingX; i++) {
      const surfacePoint = this.getWaterSurfaceAndMaxHeightAtPoint(i);
      surfacePoints.set(i, {
        x: i,
        y: surfacePoint.y,
        maxWaveHeight: surfacePoint.maxWaveHeight,
      });
    }
    return surfacePoints;
  }
  protected setWaterSurfacePoints(): void {
    const surfacePoints: SurfacePointMap = this.getWaterSurfacePoints();
    this._waterSurfacePoints = surfacePoints;
  }
  getWaterSlopeAtPoint(x: number): number {
    let slope = 0;
    this._waves.forEach((wave) => {
      slope += wave.getSurfaceAtPosition(x);
    });
    return slope;
  }
  getOriginalWaterSurfaceY(): number {
    return this._y - this._height / 2;
  }
  renderer = SeaView;
}
