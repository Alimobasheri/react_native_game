import { DIRECTION } from '@/constants/configs';
import Matter from 'matter-js';
import { SeaSystemProps } from '../Sea/types';
import { getWaterSurfaceAndMaxHeightAtPoint } from '../Sea/worklets';
import { Boat } from './Boat';
import { SharedValueTree } from '@/systems/PhysicsSystem/functions';
import { runOnJS } from 'react-native-reanimated';
import { BoatSystemProps } from './types';

export const move = (
  sea: SeaSystemProps,
  boat: BoatSystemProps,
  size: number[],
  body: SharedValueTree<Matter.Body>,
  matterSetVelocity: ({ x, y }: Matter.Vector) => void
) => {
  'worklet';
  if (!body) return;
  // Check if the boat is over water and at a stable angle
  const boatPosition = body.value.position;
  const waterSurfaceAtBoat = getWaterSurfaceAndMaxHeightAtPoint(
    sea,
    boatPosition.x
  ).y;
  const isOverWater = boatPosition.y + size[1] / 2 >= waterSurfaceAtBoat;
  const angleThreshold = Math.PI / 12; // 15 degrees threshold
  const isStable = Math.abs(body.value.angle) < angleThreshold;

  if (!(isOverWater && isStable)) return;
  const currentVelocityX = body.value.velocity.x;
  let newVelocityX = currentVelocityX;
  if (boat.direction === DIRECTION.LEFT) {
    newVelocityX =
      currentVelocityX <= 0 ? currentVelocityX - boat.acceleration : 0;
    if (Math.abs(newVelocityX) >= boat.maxVelocityX)
      newVelocityX = -boat.maxVelocityX;
    runOnJS(matterSetVelocity)({
      x: newVelocityX,
      y: body.value.velocity.y,
    });
  } else if (boat.direction === DIRECTION.RIGHT) {
    newVelocityX =
      currentVelocityX >= 0 ? currentVelocityX + boat.acceleration : 0;
    if (Math.abs(newVelocityX) >= boat.maxVelocityX)
      newVelocityX = boat.maxVelocityX;
    runOnJS(matterSetVelocity)({
      x: newVelocityX,
      y: body.value.velocity.y,
    });
  }
  // Boat._applyTilt();
};
