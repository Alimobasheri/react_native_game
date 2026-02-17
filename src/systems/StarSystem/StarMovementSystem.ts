import {
  System,
  SystemContext,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  StarComponentName,
  StarComponentData,
} from '@/data-components/StarComponent';
import {
  RenderComponentName,
  RenderComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

/**
 * StarMovementSystem - A worklet-based system for moving stars and resetting them when out of view
 *
 * This system handles:
 * - Moving stars horizontally based on their speed
 * - Resetting stars that go out of view to the right side of the screen
 * - Updating both position and render components to keep them in sync
 */
export const createStarMovementSystem = (dimensions: {
  width: number;
  height: number;
}): System => ({
  requiredComponents: [StarComponentName, RenderComponentName],
  context: SystemContext.UI,
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    // Get canvas dimensions
    const windowWidth = dimensions.width;
    const windowHeight = dimensions.height;

    if (windowWidth <= 0 || windowHeight <= 0) {
      return;
    }

    // Process all star entities
    entities.forEach((starEntity) => {
      const starComponent = components[StarComponentName].get(starEntity);
      const renderComponent = components[RenderComponentName].get(starEntity);

      if (!starComponent || !renderComponent || !renderComponent.position) {
        return;
      }

      // Move star horizontally based on speed
      const newX = renderComponent.position.x - starComponent.speed * deltaTime;

      // Check if star has gone out of view (left side of screen)
      if (newX + starComponent.radius < 0) {
        // Reset star to right side of screen with new random properties
        const newCx = windowWidth + Math.random() * 100; // Start slightly off-screen
        const newCy = Math.random() * (windowHeight / 2); // Keep in upper half
        const newRadius = Math.random() * 3 + 5; // Random radius between 5-8
        const newSpeed = Math.random() * 0.001 + 0.003; // Random speed between 0.1-0.6 (very slow for distant stars)

        // Update star component with new properties
        ecs.updateComponent<StarComponentData>(
          starEntity,
          StarComponentName,
          (star) => {
            star.cx = newCx;
            star.cy = newCy;
            star.radius = newRadius;
            star.speed = newSpeed;
          }
        );

        // Update render component
        ecs.updateComponent<RenderComponentData>(
          starEntity,
          RenderComponentName,
          (render) => {
            if (render.position) {
              render.position.x = newCx;
              render.position.y = newCy;
            }
            if (render.shape.type === 'circle') {
              render.shape.radius = newRadius;
            }
          }
        );
      } else {
        // Update render component position for normal movement
        ecs.updateComponent<RenderComponentData>(
          starEntity,
          RenderComponentName,
          (render) => {
            if (render.position) {
              render.position.x = newX;
            }
          }
        );

        // Update star component cx to keep it in sync
        ecs.updateComponent<StarComponentData>(
          starEntity,
          StarComponentName,
          (star) => {
            star.cx = newX;
          }
        );
      }
    });
  },
});
