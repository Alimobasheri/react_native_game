# Platform Shaft Path v2 — Session Plan

**Status:** Active (2026-07-05)  
**SSOT:** [platform-shaft-path-v2-spec.md](./platform-shaft-path-v2-spec.md)  
**Handoff log:** [platform-shaft-path-v2-handoff.md](../visual-design/logs/platform-shaft-path-v2-handoff.md)

---

## Can this ship in one session?

**No.** P0–P9 is ~9 slices across engine, lab, runtime, Storybook, and tests. Realistic grouping:

| Session | Slices | ~Effort | Visual milestone |
|---------|--------|---------|------------------|
| **1** (this) | P0 | Doc only | Vision locked in SSOT |
| **2** | P1 + P2 | Path + row-clock | Lab PNG wide chicane, no steel |
| **3** | P3 | Shaft derive | Storybook: dense shafts close row-by-row |
| **4** | P4 + P5 | Stack + fairness | Lab scrub stack wave; fairness ok |
| **5** | P6a + P6b | Path lateral momentum — static chicane first, then shafts |
| **6** | P7 | Four path recipes | Each recipe 3s read in Storybook |
| **7** | P8 + P9 | Chapter + cleanup | Full chapter in run; old code removed |

Adjust if a slice runs long — never skip P1 visual confirm before P3.

---

## Session 1 — DONE (doc)

**Deliverables:**
- [x] `platform-shaft-path-v2-spec.md`
- [x] `platform-shaft-path-v2-session-plan.md` (this file)
- [x] `platform-shaft-path-v2-handoff.md`

**Not done (Session 2):** P0.2 roadmap §3–9 re-scope, P0.4 tuning stubs, P1 code.

---

## Session 2 — PathIntent + row-clock (P0 tail + P1 + P2)

### Tasks

**P0 tail**
1. Update [platform-shaft-roadmap.md](./platform-shaft-roadmap.md) — add § "Path v2" pointer; mark S4 v1 recipes superseded.
2. Add v2 tuning key stubs to [platformShaftTuning.ts](../../src/config/platformShaftTuning.ts).

**P1**
3. Create `src/Game/path/platformShaft/pathIntent/types.ts`
4. Create `pathIntent/pathGenerators.ts` — 40-row chicane using `flowChicaneNextRow`, wide gaps from `WIDE_GAP_COLS_*`
5. Create `pathIntent/ceilingPinPolicy.ts` — seeded pins, `sectionId` bump
6. Tests: `pathIntent/__tests__/pathGenerators.test.ts` — SH-005 on wide gaps, path continuity
7. Lab: button **Insert path preview** in `scripts/stage-design-lab/` → PNG, no hazards

**P2**
8. Create `shaftScheduler/rowClock.ts`
9. Extend `PlatformSlabParams` with `pressDurationRows?`
10. Update `platformPressMotion.ts` — prefer rows when set
11. Tests: scroll-speed invariance at 200 vs 400 px/s

### Exit criteria

- Lab PNG: 4-col chicane, path center drifts, occasional ceiling pin, **zero steel**
- Headless: row-clock tests green
- Founder says: "this is the room I want"

### Files to open first

```
docs/game-design/platform-shaft-path-v2-spec.md
src/Game/path/flowGenerators.ts
src/Game/path/platformShaft/primitives.ts
src/config/platformShaftTuning.ts
scripts/stage-design-lab/hazard-generators.js
```

---

## Session 3 — ShaftScheduler (P3) — **SHIPPED (corner_stack baseline)**

**Delivered:** `deriveShafts`, `cornerStackFlowPlan`, `gapShiftPlan`, `composePathChicaneShaft`, passage tests. See handoff + spec §3.8.

### Tasks

1. [x] `shaftScheduler/deriveShafts.ts` — PathRowIntent[] → PlatformSlabHazard[] via `ShaftFlowKind`
2. [x] `cornerStackFlowPlan.ts` + `shaftFlowTypes.ts` — escalate/peak/deescalate/gap_shift_runway
3. [x] `composePathChicaneShaft.ts` — path + `corner_stack` derive
4. [ ] `composePathSegment.ts` — glue path + derive + harmonizer cap (partial via composePathChicaneShaft)
5. [ ] Storybook: `LockedPathChicaneShaftLoop` (verify current Swimmer.stories wiring)
6. [x] Tests: passage overlap, corner-stack phases, 1-col peak on seed 42

### Exit criteria

- [x] Device: stack builds to 1-col, deescalates before pin/gap shift (seed 42 tuning)
- [x] Not sparse wall-only at high difficulty
- [ ] Lab PNG still pending (Session 2 item A)

---

## Session 4 — Stack + fairness (P4 + P5)

### Tasks

1. `shaftScheduler/stackGrouper.ts` — side patterns, stagger, speed tiers, pressCols [1,1,2]
2. `RhythmProfile` per `sectionId`
3. `harmonizerV2/timeVaryingFairness.ts`
4. `harmonizerV2/gapHandoff.ts` + fixture tests from spec §10
5. Lab fairness-v2 port

### Exit criteria

- 3-row stack: upper faster, 2-col press in lab scrub
- `fairnessReport.ok` on 60-row segment at 200/300/400 px/s

---

## Session 5 — Path Lateral Momentum (P6a + P6b)

**Why split:** P6a ships value on **existing directed paths** before shaft chapters exist. Founder can feel chicane momentum on static blocks first.

### P6a — Static row momentum (directed paths)

1. `src/Game/water/pathLateralMomentum.ts` — state machine, run-length bonus, drag
2. Refactor [`WaterPhysicsSystem.ts`](../../src/systems/PhysicsSystem/WaterPhysicsSystem.ts) — emit `gap_shift` / `gap_narrow` impulses instead of duplicating flow math
3. Wire momentum → `flowVelocity`, `surgeEnergy`, `surfaceCurveCenterNorm`
4. [`SwimmerPhysicsSystem.ts`](../../src/systems/PhysicsSystem/SwimmerPhysicsSystem.ts) — momentum push + `COUNTER_STEER_COST`
5. Tuning in [`swimmerTuning.ts`](../../src/config/swimmerTuning.ts) `waterPhysicsTuning` (shared keys in spec §7)
6. Visual test: **directed chicane** — 5 rows drift right → bulge right, swimmer carries, left tap heavy

### P6b — Shaft impulses (platform chapters)

1. [`mergeRowHazardPass.ts`](../../src/Game/grid/mergeRowHazardPass.ts) — feed `shaft_press` impulses via `flowFromPlatform` instead of parallel `platformFlowPerRange` only
2. Stack overlap sums into same `momentumNorm`
3. Visual test: dense stack + chicane — compound push, ceiling pin fight

### Exit criteria

- Static pinball/chicane on orange blocks: momentum visible without any steel
- Shaft stack adds on top, does not replace gap-shift momentum
- Tap still wins at max difficulty (hyper-casual floor)

---

## Session 6 — Path recipes (P7)

### Tasks

1. `pathRecipes/pathTeachWave.ts`
2. `pathRecipes/pathPinballWave.ts`
3. `pathRecipes/pathSqueezeTrap.ts`
4. `pathRecipes/pathGapLadder.ts`
5. Update `composeShaftRecipe.ts` union
6. Storybook loop per recipe
7. Lab buttons + PNG per recipe

### Exit criteria

- Non-dev names gesture in 3s per recipe

---

## Session 7 — Chapter + cleanup (P8 + P9)

### Tasks

1. `composeShaftChapter.ts` — 80+ rows
2. `stageChapterPools.ts`
3. `LockedPressMixedShaftLoop`
4. Wrapper: `composePressIntroShaft` → `pathTeachWave`
5. Remove `appendSlabEvent`; migrate tests
6. Final handoff

---

## Copy-paste prompts

### Session 2

```text
Read docs/visual-design/logs/platform-shaft-path-v2-handoff.md and docs/game-design/platform-shaft-path-v2-spec.md.

Task: Implement P1 PathIntent + P2 row-clock (Session 2).

Done already: P0 vision doc, session plan, handoff.

Implement:
1. P0 tail — roadmap pointer + platformShaftTuning v2 stubs
2. pathIntent/types.ts + pathGenerators.ts (40-row chicane, wide gaps)
3. ceilingPinPolicy.ts
4. pathIntent tests
5. Lab "Insert path preview" PNG button
6. rowClock.ts + platformPressMotion row-clock + invariance tests

Start with a short plan. Worklet-safe. Lab/engine parity for new modules.
```

### Session 3

```text
Read docs/visual-design/logs/platform-shaft-path-v2-handoff.md and docs/game-design/platform-shaft-path-v2-spec.md.

Task: Implement P3 ShaftScheduler — deriveShafts from PathRowIntent, Storybook loop.

Done already: P1 path PNG confirmed, P2 row-clock tests green.

Implement deriveShafts.ts, composePathSegment, platformShaftRowPathTemplate wire, LockedPathChicaneShaftLoop, density tests.

Constraint: hazards/rows >= 0.5 on 40-row segment; 1-col at full press.
```
