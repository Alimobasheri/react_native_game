import { IGameSystem } from "../types";

export type ShipBoatCollisionItem = {
  frame: number;
  boatLabel: string;
  matterCollision: Matter.Collision;
};
export type ShipBoatCollisionList = ShipBoatCollisionItem[];

export interface ICollisionsSystem extends IGameSystem {
  get collisionsInFrame(): ShipBoatCollisionList;
}
