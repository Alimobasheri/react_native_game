import { Animation } from '../../services/Animations';

export function createDecayAnimation(
  initialVelocity: number,
  friction: number = 0.95
): Animation {
  let velocity = initialVelocity;
  // @ts-ignore
  const startTime = global.nativePerformanceNow();

  return {
    update: (sharedValue, progress, isBackward) => {
      //@ts-ignore
      const currentTime = global.nativePerformanceNow();
      const timeDelta = (currentTime - startTime) / 1000; // seconds

      // Apply decay to velocity
      velocity *= Math.pow(friction, timeDelta);

      // Update the shared value based on decaying velocity
      sharedValue.value += velocity * timeDelta * (isBackward ? -1 : 1);

      // Return true if velocity has sufficiently decayed
      return Math.abs(velocity) < 0.001;
    },
  };
}
