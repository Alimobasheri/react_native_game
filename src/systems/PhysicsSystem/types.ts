import { WaterSurfacePoint } from '@/types/globals';
import { IGameSystem } from '../types';
import Matter from 'matter-js';

export interface IPhysicsSystem extends IGameSystem {
  /**
   * Add a matter body to the world of engine created by this class.
   * @param body Body to add
   */
  addBodyToWorld(body: Matter.Body): void;
}

export type BuoyantVehicleProps = {
  body: Matter.Body;
  size: number[];
  buoyantVehicleBottomY: number;
  waterSurfaceYAtPoint: WaterSurfacePoint;
  submergedDepth: number;
  submergedArea: number;
};
