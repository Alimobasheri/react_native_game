import { FC, useMemo } from 'react';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { CaveParallaxBackgroundSystem } from '@/systems/PhysicsSystem/CaveParallaxBackgroundSystem';
import { createCaveAtmosphereLifecycleSystem } from '@/systems/VisualSystem/CaveAtmosphereLifecycleSystem';
import { CaveAtmosphereSystem } from '@/systems/VisualSystem/CaveAtmosphereSystem';

/**
 * CaveBackground — far cave parallax tiles plus fixed depth lighting overlays
 * (vertical gradient, lane lift, edge vignette).
 */
export const CaveBackground: FC = () => {
  const caveAtmosphereLifecycleSystem = useMemo(
    () => createCaveAtmosphereLifecycleSystem({ sceneKey: 'game' }),
    []
  );

  useAddSystem({ system: CaveParallaxBackgroundSystem });
  useAddSystem({ system: caveAtmosphereLifecycleSystem });
  useAddSystem({ system: CaveAtmosphereSystem });

  return null;
};
