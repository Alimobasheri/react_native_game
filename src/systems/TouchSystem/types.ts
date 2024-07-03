import { IGameSystem } from "../types";

/**
 * Reperesents a touch object in Game systems.
 */
export type TouchProps = {
  /**
   * pageX position of touch event.
   */
  x: number;
  /**
   * pageY position of touch event.
   */
  y: number;
  /**
   * The timestamp, the touch event was fired.
   */
  time: number;
};

export interface ITouchSystem extends IGameSystem {}
