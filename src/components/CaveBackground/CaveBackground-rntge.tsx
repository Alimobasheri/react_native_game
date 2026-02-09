import { FC } from 'react';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { CaveParallaxBackgroundSystem } from '@/systems/PhysicsSystem/CaveParallaxBackgroundSystem';

/**
 * CaveBackground - Full-screen cave background image for the swimmer game.
 * Registers the CaveParallaxBackgroundSystem which manages repeatable,
 * parallax-scrolling cave background segments.
 */
export const CaveBackground: FC = () => {
  useAddSystem({ system: CaveParallaxBackgroundSystem });

  return null;
};
