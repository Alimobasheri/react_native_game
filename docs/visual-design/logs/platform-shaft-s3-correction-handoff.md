# Platform Shaft Slice 3 — Correction Handoff

**Date:** 2026-07-04  
**Roadmap:** [platform-shaft-roadmap.md](../../game-design/platform-shaft-roadmap.md) §9 Slice 3  
**Architecture:** [moving-hazard-system-architecture.md](../../game-design/moving-hazard-system-architecture.md)

## What went wrong

Slice 3 shipped a **machinery stub** on top of static `ObstacleRow`:
- `effectiveGapsAtFullPress` at spawn → orange blocks in “extended press” positions
- Steel/blue layers painted on gap columns beside those blocks
- No motion, no collision update, no water coupling

Player read: broken half-press — not steel machinery.

This violated **SH-011** (machinery ≠ orange blocks) and the roadmap L7 split.

## What Slice 3 is now (correct)

| Shipped | Not shipped (Slice 5) |
|---------|----------------------|
| `composePressIntroShaft` streams via `platformShaftIntro` | Steel render |
| Rest corridor rows (2-col chute layout) | Animated press |
| `beat.hazards` in template ctx | 1-col squeeze at runtime |
| Dev lock props (`storyLockedShaftRecipe`) | Water push on squeeze |

**In-game look:** Orange corridor matching lab **rest** geometry — runway, chicane drift, release. Empty gap channel beside chute where steel will live in Slice 5.

## Removed code (do not re-add)

- `pressWallCol` on `ObstacleRowComponent`
- `machineryCols` on `buildObstacleRowRenderLayers`
- `effectiveGapsAtFullPress` at row **spawn**
- `buildPlatformSlabRenderLayers.ts` (deleted)
- `serializePlatformShaftBeat.ts` (deleted)

## Next session

Read `docs/game-design/moving-hazard-system-architecture.md` — implement `MovingHazard` + `HazardMotionSystem` (Slice 5).
