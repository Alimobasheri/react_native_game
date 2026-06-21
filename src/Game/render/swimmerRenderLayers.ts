import { RenderLayer } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

/** Swimmer game mapping onto generic RNTGE render layers. */
export const SwimmerRenderLayer = {
  Cave: RenderLayer.Background,
  /** Foreground cave rocks — parallax faster than obstacles, in front of blocks. */
  SideWalls: 150,
  Water: RenderLayer.World,
  Obstacles: RenderLayer.World,
  Swimmer: RenderLayer.Actors,
  Hud: RenderLayer.Hud,
} as const;
