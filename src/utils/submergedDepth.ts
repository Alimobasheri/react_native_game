import { SharedValueTree } from '@/systems/PhysicsSystem/functions';
import { WaterSurfacePoint } from '@/types/globals';
import Matter from 'matter-js';

export type getSubmergedAreaReturnValue = {
  /**
   * Maximum amount of verticle space of body covered by water.
   */
  submergedDepth: number;
  /**
   * Area of body covered by water.
   */
  submergedArea: number;
};

/**
 * Given a body's maximum visible verticle point (based on body angle), its size and the water surface at the point, returns the depth and area covered by water.
 * @param bottomY Maximum visible verticle space of body
 * @param size Width and height array
 * @param surfaceY Water surface at the point of body position.x
 * @returns {getSubmergedAreaReturnValue} depth and area of covered body space
 */
export function getSubmergedArea(
  body: SharedValueTree<Matter.Body>,
  size: number[],
  surfaceY: WaterSurfacePoint
): getSubmergedAreaReturnValue {
  'worklet';
  // Calculate the submerged depth based on the boat's position relative to the wave
  const submergedDepth =
    body.value.bounds.max.y * Math.cos(body.value.angle) - surfaceY.y;
  // if (body.label.includes('ship'))
  //   console.log('🚀 ~ submergedDepth:', submergedDepth);
  const submergedArea =
    submergedDepth < 0
      ? 0
      : Math.min(submergedDepth > 0 ? submergedDepth : 0, size[1]) * size[0]; // Cross-sectional submerged area
  return { submergedDepth, submergedArea };
}

export function getSubmergedDepthAtX(
  x: number,
  body: Matter.Body,
  size: number[],
  surfaceY: WaterSurfacePoint
): number {
  const { x: centerX, y: centerY } = body.position;
  const angle = body.angle;
  const width = body.bounds.max.x - body.bounds.min.x;
  const height = body.bounds.max.y - body.bounds.min.y;

  // Translate the given x to local coordinates relative to the body's center
  const localX =
    (x - centerX) * Math.cos(-angle) - (0 - centerY) * Math.sin(-angle);

  // Now, you know the local y should correspond to the height of the rectangle (since y should be on the edge)
  const localY = Math.sqrt((width / 2) ** 2 - localX ** 2);

  // Translate localY back to world coordinates
  const worldY =
    centerY + size[1] / 2 + localX * Math.sin(angle) + localY * Math.cos(angle);
  const diff = worldY - surfaceY.y;
  return diff < 0 ? 0 : diff;
}
