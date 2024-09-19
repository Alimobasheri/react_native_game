import { Animation } from '../../services/Animations';

export function createSpringAnimation(
  targetValue: number,
  stiffness: number = 0.1,
  damping: number = 0.8
): Animation {
  let velocity = 0;
  //@ts-ignore
  const startTime = global.nativePerformanceNow();

  return {
    update: (sharedValue, progress, isBackward) => {
      //@ts-ignore
      const currentTime = global.nativePerformanceNow();
      const timeDelta = (currentTime - startTime) / 1000; // seconds

      // Spring formula
      const displacement = sharedValue.value - targetValue;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * velocity;
      const totalForce = springForce + dampingForce;

      // Update velocity and position
      velocity += totalForce * timeDelta;
      sharedValue.value += velocity * timeDelta * (isBackward ? -1 : 1);

      // Return true if animation is near the target
      return Math.abs(velocity) < 0.001 && Math.abs(displacement) < 0.001;
    },
  };
}
