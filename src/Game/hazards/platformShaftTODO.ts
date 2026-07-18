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

// --- Vertical Piston polish (gameplay shipped; juice deferred) ---

/** PS-TODO-006: Low metallic click/ratchet when piston band first enters viewport. */
export const PLATFORM_SHAFT_PISTON_SPAWN_SFX = false;

/** PS-TODO-007: High-pitch warning tick + light haptic during telegraph flash. */
export const PLATFORM_SHAFT_PISTON_TELEGRAPH_SFX_HAPTIC = false;

/** PS-TODO-008: Faint sliding mechanical friction loop while head moves. */
export const PLATFORM_SHAFT_PISTON_MOVE_FRICTION_SFX = false;

/** PS-TODO-009: Muffled thud + water splash SFX + medium haptic on bounce. */
export const PLATFORM_SHAFT_PISTON_BOUNCE_SFX_HAPTIC = false;

/** PS-TODO-010: Dust/spark trail particles at piston base while moving. */
export const PLATFORM_SHAFT_PISTON_BASE_SPARKS = false;

/** PS-TODO-011: Radial white foam burst at bounce impact point. */
export const PLATFORM_SHAFT_PISTON_BOUNCE_FOAM = false;

/** PS-TODO-012: 3-frame swimmer squash (scaleX 0.6, scaleY 1.2) on piston bounce. */
export const PLATFORM_SHAFT_PISTON_BOUNCE_SQUASH = false;
