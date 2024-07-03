import { DIRECTION } from "@/constants/configs";
import Matter from "matter-js";

export const getDirection = (
  bodyA: Matter.Body,
  bodyB: Matter.Body
): DIRECTION => {
  return bodyB.position.x - bodyA.position.x > 0
    ? DIRECTION.RIGHT
    : DIRECTION.LEFT;
};
