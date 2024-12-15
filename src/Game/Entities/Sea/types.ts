import { Point2D, WaterSurfacePoint } from '@/types/globals';
import { IWave } from '../Wave/types';
import { FC, JSX } from 'react';
import { EntityRendererProps } from '@/constants/views';
import { Sea } from './Sea';
import { SharedValue } from 'react-native-reanimated';

export type SurfacePointMap = Map<number, WaterSurfacePoint>;

export enum WaveSource {
  TOUCH = 'touch',
  DISTURBANCE = 'disturbance',
  FLOW = 'FLOW',
}

export type InitiateWaveConfig = {
  x: SharedValue<number>;
  amplitude: SharedValue<number>;
  frequency: SharedValue<number>;
  phase: SharedValue<number>;
  time: SharedValue<number>;
  speed: SharedValue<number>;
  source: WaveSource;
  layerIndex?: number;
};

/**
 * Reperesents a Sea Class, used to render waves and water.
 * @interface Sea
 */
export interface ISea {
  get width(): SharedValue<number>;
  get height(): SharedValue<number>;
  get startingY(): SharedValue<number>;
  get startingX(): SharedValue<number>;
  get waterSurfacePoints(): SurfacePointMap;
  get layers(): Sea[];
  /**
   * Array of current active waves, affecting water surface.
   * @returns {IWave[]}
   */
  get waves(): IWave[];
  /**
   * Updates all waves in the sea.
   * @param currentFrame The number of the current frame
   * @returns {void}
   */
  update: (currentFrame?: number) => void;
  /**
   * Given coordinations and configs, creates a wave and starts updating it along existing waves.
   * @param {InitiateWaveConfig} config Initial config for wave
   * @returns {IWave} The new created wave.
   */
  initiateWave: (config: InitiateWaveConfig) => IWave;
  /**
   * Renders the sea using SeaView Component.
   */
  renderer: FC<EntityRendererProps<ISea>>;
  /**
   * Given an x-coordinate, returns water surface by combining all active waves affecting that point.
   * @param x x-coordinate of the point
   * @returns {number} height of water surface at the point.
   */
  getWaterSurfaceAndMaxHeightAtPoint: (x: number) => WaterSurfacePoint;
  /**
   * Returns a Mapping of the visible x-coordinates of water to the surface of water in that point.
   * @returns {SurfacePointMap} Mapping x to x,y of water surface
   */
  getWaterSurfacePoints: () => SurfacePointMap;
  /**
   * Given an x-coordinate, returns water slope by combining all active waves affecting that point.
   * @param x x-coordinate of the point
   * @returns {numebr} combined water's slope at the point
   */
  getWaterSlopeAtPoint: (x: number) => number;
  /**
   * Returns the original water surface y-coordinate.
   * Based on y and height given provided in constructor.
   */
  getOriginalWaterSurfaceY(): number;
}

/**
 * Initial config passed to constructor of Sea Class.
 */
export type SeaConfig = {
  /**
   * The center of the x-coordinate of the sea in accordance to its width.
   */
  x: SharedValue<number>;
  /**
   * The center of the y-coordinate of the sea in accordance to its height.
   */
  y: SharedValue<number>;
  /**
   * Width of the sea rendered.
   */
  width: SharedValue<number>;
  /**
   * Height of the sea rendered.
   */
  height: SharedValue<number>;
  windowWidth: SharedValue<number>;
  windowHeight: SharedValue<number>;
  /**
   * How many layers this sea item contains.
   */
  layersCount?: number;
  layersConfigs?: SeaConfig[];
  /**
   * Index of the layer that is the main layer the vehicles move on.
   */
  mainLayerIndex?: number;
  gradientColors?: string[];
  flowAmplitude: SharedValue<number>;
  flowFrequency: SharedValue<number>;
  flowSpeed: SharedValue<number>;
  flowPhase: SharedValue<number>;
  flowTime: SharedValue<number>;
  bounds: { startingX: SharedValue<number>; startingY: SharedValue<number> };
  dynamicWave: IWave;
};
