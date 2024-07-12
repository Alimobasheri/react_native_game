import { WaterSurfacePoint } from "@/types/globals";

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
  bottomY: number,
  size: number[],
  surfaceY: WaterSurfacePoint
): getSubmergedAreaReturnValue {
  // Calculate the submerged depth based on the boat's position relative to the wave
  const submergedDepth = bottomY - surfaceY.y;
  const submergedArea =
    Math.min(submergedDepth > 0 ? submergedDepth : 0, size[1]) * size[0]; // Cross-sectional submerged area
  return { submergedDepth, submergedArea };
}
