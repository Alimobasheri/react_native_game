export const getDirection = (bodyA, bodyB) => {
  return { x: bodyB.position.x - bodyA.position.x > 0 ? 1 : -1 };
};
