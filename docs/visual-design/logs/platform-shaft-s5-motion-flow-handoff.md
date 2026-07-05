# Platform Shaft Slice 5 — Motion + Flow Handoff

**Date:** 2026-07-04  
**Roadmap:** [platform-shaft-roadmap.md](../../game-design/platform-shaft-roadmap.md) §9 Slice 5  
**Architecture:** [moving-hazard-system-architecture.md](../../game-design/moving-hazard-system-architecture.md)

## Before → after (player eyes)

| Moment        | Before (Slice 3)           | After (Slice 5)                                       |
| ------------- | -------------------------- | ----------------------------------------------------- |
| **Slab rows** | Rest 2-col corridor only   | **Gray steel slab** slides in from press wall         |
| **Gap width** | Static rest geometry       | Narrows **3→2→1 col** as press completes              |
| **Water**     | Gap-range from static rows | Squeeze + **lateral push** when gap tightens          |
| **Collision** | Rest gaps only             | Swimmer blocked by pressed slab columns               |
| **Art split** | Orange clay only           | Orange corridor + **steel machinery** entity (SH-011) |

## Stability fix (2026-07-04)

Root bugs fixed: inverted phase clock, wrong band row for water coupling, anchor re-resolve on loop, duplicate `beatRowIndex` collision.

| Invariant               | Implementation                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Phase SSOT**          | Trailing row (largest Y / `rowStart` side) — first into water on scroll-down                                |
| **Monotonic press**     | `maxWorldBeat` + `phase01` latched on `HazardBandLead`                                                      |
| **Transition band**     | Shared `waterTransitionBandFromSurface` — ObstacleSystem, hazard phase, WaterPhysics                        |
| **Frozen anchor**       | `healAnchorRowIds` — drop dead entity IDs only; never beat re-resolve at runtime                            |
| **effectiveGaps scope** | Only rows in live hazard anchor entity sets — not all `beatRowIndex` matches                                |
| **Loop identity**       | `shaftSegmentEpoch` on rows/ctx/anchor; spawn resolves with epoch filter                                    |
| **Loop purge**          | Rollover on `platformShaftIntro` + `storyLockShaftLoop` strips band components + clears `effectiveGaps` |

## Row-integrated hazard bands (2026-07-04)

**Architecture pivot:** hazards are **features of the ObstacleRow grid**, not a parallel `MovingHazard` entity world.

| Before | After |
|--------|-------|
| Separate `MovingHazard` entity + `runHazardMotionPass` | `HazardBandLead` / `HazardBandMember` on row entities |
| `hazardBeatRowAtTransition` trailing clock | `worldBeatFromWaterLock` from `Water.centerRowEntity` |
| Steel on ghost entity | Steel on **lead row** `RenderComponent` (`appendHazardSteelToRowRender`) |
| Loop purge removes hazard entities | `purgePlatformShaftHazardState` strips band components + clears `effectiveGaps` |

| Module | Role |
|--------|------|
| `src/Game/ecs-components/HazardBandLead.ts` | Anchor row (`bounds.rowStart`) — phase latches, member IDs |
| `src/Game/ecs-components/HazardBandMember.ts` | Other band rows — link to lead |
| `src/Game/hazards/hazardBandSpawn.ts` | Spawn lead + members when band complete |
| `src/Game/grid/worldBeatFromWaterLock.ts` | Water-lock world beat + monotonic latch |
| `src/Game/grid/mergeRowHazardPass.ts` | Occupancy, steel render, flow — ObstacleSystem tail |
| `src/Game/render/appendHazardSteelToRowRender.ts` | Orange layers preserved + steel rect |
| `src/Game/hazards/purgePlatformShaftHazardState.ts` | Loop restart — strip bands, restore orange render |

**Telegraph:** steel draws at `localSec === 0` (1-col rest wall) — no `pressExtent > 0.001` render gate, no `0.15` width fudge in `gridSpanToWorld`.

**Lifecycle:** `healLiveMemberIds` shrinks band when rows despawn; all dead → strip lead + members; restart removes rows (bands die with rows).

**Deleted:** `MovingHazard.ts`, `spawnMovingHazard.ts`, `runHazardMotionPass.ts`, `HazardMotionSystem.ts`.

## Grid-anchored refactor (2026-07-04)

Steel slabs use beat-row + column grid SSOT — not floating Y or global water-center clocks.

| Module                                 | Role                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `src/Game/grid/types.ts`               | `GridSpan`, `GridAnchor`, `GridOccupancy`                      |
| `src/Game/grid/waterTransitionBand.ts` | Shared transition geometry (lockAhead, target, start/end)      |
| `src/Game/grid/gridSpan.ts`            | Span from `PlatformSlabHazard`                                 |
| `src/Game/grid/gridAnchor.ts`          | Spawn-time anchor + `healAnchorRowIds`; epoch-filtered resolve |
| `src/Game/grid/beatRowAtWorldY.ts`     | Trailing-row beat at water transition band                     |
| `src/Game/grid/hazardPhase.ts`         | Band-local press phase                                         |
| `src/Game/grid/resolveOccupancy.ts`    | `effectiveGaps` + blocked cols (wraps press motion)            |
| `src/Game/grid/gridSpanToWorld.ts`     | Render rect from grid extents + anchored row Y                 |
| `src/Game/grid/mergeRowHazardPass.ts` | Per-frame occupancy, steel on lead row, flow |

**Spawn:** hazard spawns when `rowEnd` band row exists (retroactive pass catches initial-seed skips).  
**Motion:** `mergeRowHazardPass` called from **ObstacleSystem tail** (same frame as row scroll).  
**Phase:** `worldBeatFromWaterLock` on `Water.centerRowEntity` — monotonic latch per lead.

## Shipped modules

| Module                                             | Role                                           |
| -------------------------------------------------- | ---------------------------------------------- |
| `src/Game/hazards/platformPressMotion.ts`          | Lab-parity press ease, partial press, timing   |
| `src/Game/ecs-components/HazardBandLead.ts`      | Platform slab lead on anchor row               |
| `src/Game/ecs-components/HazardBandMember.ts`    | Member rows in band                            |
| `src/Game/hazards/hazardBandSpawn.ts`            | Attach lead + members on band complete         |
| `src/Game/hazards/hazardSpawnFromBeat.ts`        | Delegates to band spawn                        |
| `src/Game/grid/mergeRowHazardPass.ts`            | Per-frame occupancy + steel + flow             |
| `src/Game/render/appendHazardSteelToRowRender.ts`| Steel on lead row without clobbering orange    |
| `src/Game/render/buildMovingHazardRenderLayers.ts` | Steel rect geometry (reused by row bands)    |
| `src/Game/hazards/flowFromPlatform.ts`             | PS-007 flow (`flowNormFromPressVelocity`)      |
| `src/Game/path/obstacleRowGeometry.ts`             | Effective solid column centers                 |
| `src/config/platformShaftTuning.ts`                | `FLOW_*` tuning keys                           |

## Integration points

- `ObstacleRowComponent`: `beatRowIndex`, `shaftSegmentEpoch`, `effectiveGaps`, `effectiveSolidColumnCentersX`
- `WaterPhysicsSystem`: reads effective gaps; merges `platformFlowPerRange`; shared transition band
- `swimmerBlockCollision`: collision uses effective mask
- `ObstacleSystem`: row scroll + hazard spawn + loop purge + `mergeRowHazardPass` (same frame)
- `RestartGameplaySystem`: row batch remove clears band components with rows

## Headless verify

```bash
npm test -- --watchAll=false src/Game/grid/ src/Game/hazards/ src/Game/path/platformShaft/
```

83 tests (grid + hazards + platformShaft) — scroll coupling, telegraph render, band lifecycle, segment loop purge.

## Visual test recipe

1. App.tsx or Storybook → `LockedPressIntroShaftLoop`
2. Swim intro shaft — steel appears as band nears water (not early / not offset rows)
3. Press completes → **one open column** at narrowest
4. Water pushes into shrinking lane on stack/climax slabs
5. Loop restart → no stale steel entities, no ghost pin below visible shaft
6. Steel **glued to orange rows** — scrolls down with corridor (no floating rects)

## Not done (Slice 4+)

| ID  | Task                                                                 |
| --- | -------------------------------------------------------------------- |
| S4  | Additional recipes (pinball, stack, squeeze, mixed)                  |
| S6  | `composeShaftChapter` full chapter arc                               |
| S7  | Stage 2+ shaft pool draw                                             |
| Art | `assets/hazards/` WebP steel sheets (placeholder rect ships Slice 5) |

## Next session prompt

```text
Read docs/visual-design/logs/platform-shaft-s5-motion-flow-handoff.md and platform-shaft-roadmap.md §9 Slice 4.

Task: pressPinballPair + pressStackCascade recipes — lab + engine + locked Storybook loops.

Done: Row-integrated hazard bands — merge pass, steel on lead row, world-beat clock, loop purge.
```
