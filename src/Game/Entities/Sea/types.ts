import { Point2D, WaterSurfacePoint } from "@/types/globals";
import { IWave } from "../Wave/types";
import { FC, JSX } from "react";
import { EntityRendererProps } from "@/constants/views";
import { Sea } from "./Sea";

export type SurfacePointMap = Map<number, WaterSurfacePoint>;

export enum WaveSource {
  TOUCH = "touch",
  DISTURBANCE = "disturbance",
  FLOW = "FLOW",
}

export type InitiateWaveConfig = {
  x: number;
  amplitude: number;
  frequency: number;
  phase?: number;
  time?: number;
  speed?: number;
  initialForce?: number;
  source: WaveSource;
  layerIndex?: number;
};

/**
 * Reperesents a Sea Class, used to render waves and water.
 * @interface Sea
 */
export interface ISea {
  get width(): number;
  get height(): number;
  get startingY(): number;
  get startingX(): number;
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
  x: number;
  /**
   * The center of the y-coordinate of the sea in accordance to its height.
   */
  y: number;
  /**
   * Width of the sea rendered.
   */
  width: number;
  /**
   * Height of the sea rendered.
   */
  height: number;
  windowWidth: number;
  windowHeight: number;
  /**
   * How many layers this sea item contains.
   */
  layersCount?: number;
  /**
   * Index of the layer that is the main layer the vehicles move on.
   */
  mainLayerIndex?: number;
  gradientColors?: string[];
  flowAmplitude?: number;
  flowFrequency?: number;
  flowSpeed?: number;
};
