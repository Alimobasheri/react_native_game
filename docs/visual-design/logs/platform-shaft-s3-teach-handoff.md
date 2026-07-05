# Platform Shaft Slice 3 — Engine Streaming + Render Stub Handoff

**Date:** 2026-07-04  
**Roadmap:** [platform-shaft-roadmap.md](../../game-design/platform-shaft-roadmap.md) §9 Slice 3

## Before → after (player eyes)

| Moment | Before (Slice 2) | After (Slice 3) |
|--------|------------------|-----------------|
| **App reload** | Directed multipath only | **Intro press shaft** streams when shaft lock props set |
| **Runway** | Random procedural gaps | ~7-row safe 2-col corridor (difficulty 0.4) |
| **Slab rows** | No steel read | **Gray steel overlay** on press wall + **1-col squeeze** (static full-press) |
| **Loop** | N/A | `storyLockShaftLoop=true` repeats ~33-row segment |

## Shipped modules

| Module | Role |
|--------|------|
| `src/Game/path/platformShaft/primitives.ts` | Grid helpers, full-press gap math |
| `src/Game/path/platformShaft/composePressIntroShaft.ts` | Intro shaft composer (5 hazards) |
| `src/Game/path/platformShaft/recipes/pressTeachSingle.ts` | Atomic recipe (tests only) |
| `src/Game/path/platformShaft/platformShaftRowPathTemplate.ts` | `platformShaftIntro` RowPathTemplate |
| `src/Game/render/buildPlatformSlabRenderLayers.ts` | Steel machinery render stub |
| `src/config/platformShaftTuning.ts` | `PLATFORM_SLAB_STEEL_COLOR` |
| `src/systems/PhysicsSystem/ObstacleSystem.ts` | Shaft lock template override + spawn |

## Static full-press (interim)

Slice 3 applies **full-press gap geometry at spawn** on slab rows — player sees 1-col squeeze immediately. **Animated press + water push deferred to Slice 5** (`HazardMotionSystem`).

## Headless verify

```bash
npm test -- --watchAll=false src/Game/path/platformShaft/__tests__/
```

| Check | Result |
|-------|--------|
| Rows @ difficulty 0.4 | ≥ 33 |
| Rows @ difficulty 0 | ≥ 34 |
| Hazards | ≥ 5 |
| Min gap @ full press | 1 col |
| Harmonizer caps | none on seed 42 / d=0.4 |

## Visual test recipe

1. App.tsx — shaft lock props already set
2. Reload device → swim intro shaft arc
3. Slab zones: gray steel on wall, **one water column** at narrowest
4. After segment ends → loop repeats (same seed 42)
5. Storybook → `LockedPressIntroShaftLoop`

## Not done (Slice 5)

| ID | Task |
|----|------|
| S5.1 | `MovingHazard` + `HazardMotionSystem` — timed press animation |
| S5.2 | `flowFromPlatform.ts` → water lateral push |
| S5.3 | Flow tuning |

## Future prompt

```text
Read docs/visual-design/logs/platform-shaft-s3-teach-handoff.md and platform-shaft-roadmap.md §9 Slice 5.

Task: HazardMotionSystem + flow force — animated press stroke and water push on squeeze.

Done: composePressIntroShaft streaming, static full-press, steel render stub.
```
