/**
 * Platform shaft — deferred features backlog.
 *
 * Spec: docs/game-design/platform-shaft-roadmap.md §10
 * Do not enable without founder sign-off + slice plan.
 */

/** PS-TODO-001: Multi-layer water surface for true slab-to-wall seal. */
export const PLATFORM_SHAFT_MULTI_LAYER_WATER = false;

/** PS-TODO-002: Sharp hazards on opposite static orange blocks. */
export const PLATFORM_SHAFT_SHARP_ON_OPPOSITE_BLOCKS = false;

/** PS-TODO-003: Sharp teeth on moving slab face (moving hitbox + scrape policy). */
export const PLATFORM_SHAFT_SHARP_ON_SLAB_FACE = false;

/** PS-TODO-004: Slab retract stroke after hold (Jelly Jump style). Founder locked hold-only for v1 (PS-001). */
export const PLATFORM_SHAFT_SLAB_RETRACT = false;

/** PS-TODO-005: Row-integrated hazard bands — see docs/game-design/moving-hazard-system-architecture.md */
export const PLATFORM_SHAFT_ROW_HAZARD_BANDS = true;
