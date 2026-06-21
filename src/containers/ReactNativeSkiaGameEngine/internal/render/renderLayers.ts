/** Suggested coarse render passes. Games may use custom layer numbers. */
export const RenderLayer = {
  Background: 0,
  World: 100,
  Actors: 200,
  Foreground: 300,
  Hud: 1000,
  Debug: 2000,
} as const;
