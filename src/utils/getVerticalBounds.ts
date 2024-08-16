import Matter from 'matter-js';

export type verticleBoundsResult = {
  /**
   * Minimum y boundary of a body, with regards to its angle.
   */
  bottomY: number;
  /**
   * Maximum y boundary of a body, with regards to its angle.
   */
  topY: number;
};

export function getVerticleBounds(
  body: Matter.Body,
  size: number[]
): verticleBoundsResult {
  const bounds = Matter.Bounds.create(body.vertices);
  // console.log('🚀 ~ bounds:', bounds);
  const bottomY = body.position.y + (size[1] / 2) * Math.cos(body.angle);
  const topY = body.position.y - (size[1] / 2) * Math.cos(body.angle);
  return { bottomY: bounds.max.y, topY: bounds.min.y };
}
