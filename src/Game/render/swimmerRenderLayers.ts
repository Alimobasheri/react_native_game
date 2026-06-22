import { RenderLayer } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

/** Swimmer game mapping onto generic RNTGE render layers. */
export const SwimmerRenderLayer = {
  /** Fixed vertical gradient + lane lift (deepest pass). */
  CaveBase: RenderLayer.Background,
  /** Scrolling far cave texture tiles. */
  CaveParallax: 8,
  /** Full-screen edge vignette over gameplay; kept below HUD for readable score. */
  CaveAtmosphere: RenderLayer.Hud - 50,
  /** Swimmer — drawn before water so the body reads inside the fill. */
  Swimmer: RenderLayer.World - 2,
  /** Bright aqua water — over swimmer, under blocks. */
  Water: RenderLayer.World - 1,
  /** Blocks — Y-sorted above water. */
  Obstacles: RenderLayer.World,
  /** Foreground cave rocks — slightly faster parallax than blocks (layer in front). */
  SideWalls: 150,
  Hud: RenderLayer.Hud,
} as const;
