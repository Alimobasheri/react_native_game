import { IGameSystem } from "../types";

export type BoatSystemConfig = {
  windowWidth: number;
  windowHeight: number;
  originalWaterSUrfaceY: number;
};

export interface IBoatSystem extends IGameSystem {}
