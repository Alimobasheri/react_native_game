# Passage Timing & Flow Streak — Master Roadmap

**Status:** Draft v1.3 (2026-07-03) — **authoritative implementation blueprint** for skill/timing/physics refactor  
**Audience:** Founder, implementers, future agent sessions  
**Supersedes for timing work:** Wave 3 skill-praise assumptions in [player-experience-roadmap.md](./player-experience-roadmap.md) §15 (detectors remain shipped; **semantics evolve** per this doc)

**Companion docs (do not duplicate — link and extend):**

| Doc | Owns |
|-----|------|
| [player-experience-roadmap.md](./player-experience-roadmap.md) | Layer A/B meta, phases P0–P7, copy deck, art pipeline |
| [run-level-progression.md](./run-level-progression.md) | Run blueprint, macro FLOW/TENSION/CLIMAX/RELEASE, milestone pools |
| [../../src/docs/game-designer-llm-context.md](../../src/docs/game-designer-llm-context.md) | Core loop, grid, death rules |

---

## 0. How to use this document

1. **Read §2 locked decisions** before coding — do not re-litigate product rules.
2. **Pick one track** from §9 — only one physics/timing track in flight unless explicitly parallel (e.g. unit tests while art stubs trails).
3. **Every change** must map to a row in §4 (current system) and §5 (target delta).
4. **Ship player-visible slices** per track exit criteria (§9).
5. **Update checkboxes** in §9 and log handoffs under `docs/visual-design/logs/`.

---

## 1. North star — product rule (locked)

> **Perfect timing** = clean passage through a **gap-shift seam** at the current **stage speed**.  
> **Acceptable timing** = survive the passage without hard block (may scrape).  
> **Failed timing** = hard side block or pin before commit completes — body disruption, no trail, streak break.

**Player fantasy:** Read the seam → tap into the water curve → shine through the shift (Flappy Dunk swish / Dune smooth comet). Tap late or scrape the wall → bounce, dull water, silence — you *might* survive but you *know* you failed the beat.

**Authoritative enum (to implement):**

```typescript
type PassageTimingTier = 'perfect' | 'acceptable' | 'failed';
```

All praise copy, trail state, flow streak, and +N bonuses **must** derive from this enum — never from tap count or row index alone.

---

## 2. Locked design decisions (Passage Timing)

| ID | Decision | Rationale | Invalidates |
|----|----------|-----------|-------------|
| **PT-001** | Skills are **passage-defined** (gap-shift seams, path archetypes), not row-index events | Player learns habits per seam, not per arbitrary row tick | Row-only NICE! without passage context |
| **PT-002** | **Speed is constant per stage** (one full directed-path loop); macro phases drive **geometry only**; RELEASE eases speed as visual pre-ramp to next stage | Learnable timing windows per chapter (Dune/Flappy Dunk) | Continuous `raisingSpeed` acceleration during play; per-phase speed steps within a loop |
| **PT-003** | **Perfect** requires `passageIsClean` + steer proof + gap-shift topology; **acceptable** allows soft scrape; **failed** = hard block or pin in passage window | Three-tier feedback matches player mental model | Hygiene-only tier without timing phase |
| **PT-004** | **Flow streak** = consecutive **perfect** passages; persists until hard break | Dune ×2/×4 comet; movement skill not tap skill | Tap `rapidTapStreak` / HUD ×2/×3 as primary combo |
| **PT-005** | **Trail VFX** on only while flow streak ≥ 1 (perfect ignition); escalates with streak | Stateful reward channel, not one-shot particles | Word flash alone as skill reward |
| **PT-006** | **Failed timing** triggers **bounce disruptor** (velocity kill + wall bump squash); not a second survival loop | Hyper-casual snappy fail feel | Messy scrape → silent survival as default flow |
| **PT-007** | **ZIG-ZAG!** only on paths requiring **alternating gap-shift sign** (pinball/chicane); disable path-agnostic `zigzag_tap` | Praise must match geometry | `zigzagTapDetection.ts` ms-window streak |
| **PT-008** | **Rhythm schema** drives generator beat placement; rhythm breaks only in TENSION/CLIMAX after ≥2 motif repeats | Geometry Dash / rhythm-group research | Random procedural gaps without tap contract |
| **PT-009** | Speed steps only on **RELEASE → FLOW** boundary or explicit stage reward corridor | No mid-passage unfair window shrink | Speed change mid pinball segment |
| **PT-010** | L-010 geometry vocabulary plateau **unchanged** — timing refactor uses **existing** path tokens | Scope control | New gap mutators for “variety” |
| **PT-011** | **REST corridor** dims trail VFX; does **not** break flow streak | Reward corridor keeps comet feel | Streak reset on GREAT! |
| **PT-012** | **Acceptable** timing = **silence** — no word flash, no +N flyout | Only perfect earns praise juice | Acceptable +1 flyout |
| **PT-013** | **Near miss** does **not** break flow streak | Orthogonal survival skill | Streak break on clutch escape |
| **PT-014** | **TAP coach** stays shipped as-is; onboarding gate **deferred** (founder device pass later) | Don't block Track 1 on coach policy | Removing TAP before replacement |
| **PT-015** | **`rapidTapStreak` → tap impulse mult** stays **always** (pinned or not); **never** affects score, HUD combo, or `praiseBonus` | Tap chain = steering power only | Tap mult on score; pin-only mult |
| **PT-016** | **Perfect timing = physics outcome at gap-shift seam** — `PassageFlowSampler` (`pinnedSeen`, `hardBlockSeen`, `softScrapeSeen`) from collision is authoritative; **no** config `gapBlend` / tap clocks in feedback; tap optional (current can thread clean); “commit window” = emergent block geometry (Flappy Dunk basket rims) | Config commit fractions; feedback-layer tap timing; `passageTiming.ts` | |

**Relationship to player-experience-roadmap L-006:** Skill feedback remains highest ROI — this doc **deepens** L-006; it does not deprioritize it.

---

## 3. Concept glossary (shared vocabulary)

| Term | Definition | Engine anchor |
|------|------------|---------------|
| **Gap-shift seam** | Row boundary where lane cluster center moves ≥ `minStepDelta` cols | `centerDeltaCols()` in `gapTopology.ts` |
| **Passage segment** | Approach runway → seam → exit settle between two row crosses | Evolves from `PassageFlowSampler` (per-row today) |
| **Gap blend phase** | `Water.gapBlend` 0→1 while surface curve lerps between prev/curr gap — **visual/physics water surface only**; not a feedback timing gate (PT-016) | `waterPhysicsTuning.GAP_BLEND_SPEED_PER_SECOND` |
| **Stage speed** | Constant `raisingSpeed` for one directed-path loop (`stageIndex`); RELEASE relax ramp | `stageProgression.ts` + `StageSpeedSystem.ts` |
| **Commit corridor** | *(conceptual)* Moments physics still allows a clean thread through the shift — block rims, pin threat, speeds; **simulated** by collision, **observed** by `PassageFlowSampler` | `swimmerBlockCollision.ts` → `passageFlowScoring.ts` |
| **Flow streak** | Count of consecutive **perfect** passages | New state on `GameplayFeedbackManager` or `Swimmer` |
| **Macro phase** | FLOW / TENSION / CLIMAX / RELEASE | `pacingDirector.ts` |
| **Path archetype** | pinball, funnel, chicane, chute, release, paradox | `branchKey` on `ObstacleRow` / generators |

---

## 4. Current system inventory (as-shipped baseline)

### 4.1 Detection & praise pipeline

| Piece | Location | What it does today | Passage-timing fit |
|-------|----------|-------------------|-------------------|
| Orchestrator | `src/systems/GameplayFeedbackSystem.ts` | Per-frame contact sample → row-cross on `centerRowEntity` change → candidates → router → slots | **Clock OK** ✅; optional `PassageSegment` FSM for Track 3 diag only |
| Row cross snapshot | `src/Game/feedback/rowCrossEval.ts` | Builds `RowCrossSnapshot` with topology, `crossQualified`, `cleanCross` | **Keep** as seam event source |
| Row history | `src/Game/feedback/rowCrossHistory.ts` | Ring buffer, identical-gap skip | **Keep** |
| Passage sampler (per-row) | `src/Game/feedback/passageFlowScoring.ts` | `pinnedSeen`, `hardBlockSeen`, `softScrapeSeen`, steer span | **Extend** to multi-row segment |
| Stitch sampler | `src/Game/feedback/hygieneScoring.ts` | Per-frame scrape/pin/clearance across stitch window | **Keep** for hygiene; subordinate to timing tier |
| Shift commit (NICE!) | `src/Game/feedback/steerPraiseDetection.ts` → `evaluateShiftCommit` | Topology shift + passage intact + steer proof | **`passageTimingEval` gates perfect vs acceptable** ✅ Slice A (`shift_commit` only) |
| Steer patterns | `steerPraiseDetection.ts` → `detectSteerPraise` | slalom, cross_sweep, fork_clean | **Keep** — path-gated |
| Snap transfer | `src/Game/feedback/snapTransferDetection.ts` | pinhole→flare→snap | **Keep** — pinball-adjacent |
| Zigzag tap | `src/Game/feedback/zigzagTapDetection.ts` | 400ms alternating tap streak | **Disabled** ✅ Slice A (PT-007); replace with `zigzag_passage` Track 3 |
| Zigzag chain (geometry) | `skillFeedback.ts` → `zigzag_chain` `enabled: false` | Alternating center sign run | **Re-enable** with passage timing |
| Near miss | `src/Game/feedback/nearMissDetection.ts` | Tap-gated pin threat escape | **Keep** — orthogonal survival praise |
| Tap coach | `src/Game/feedback/tapCoachDetection.ts` | TAP / SAVED! | **Keep**; tighten pin strict mode in physics |
| Praise router | `src/Game/feedback/praiseRouter.ts` | Priority, cooldowns, dual word stack | **Extend** for flow streak copy escalation |
| Praise bonus | `src/Game/feedback/praiseBonus.ts` | +N from clearance/hygiene/speed | **Scale** by flow streak multiplier |
| Config | `src/config/skillFeedback.ts` | Families, tiers, hygiene, survival ramp | **Add** `flowStreak` block (Track 3); passage timing tiers need no separate config (PT-016) |
| Flash VFX | `src/Game/feedback/feedbackFlashAnim.ts`, `gameplayFeedback.ts` | Fredoka float-up | **Keep** |
| State store | `src/Game/ecs-components/GameplayFeedbackManager.ts` | `skillFeedback`, slots, diag ring | **Add** `flowStreak` on `skillFeedback` ✅ Slice A |
| Types | `src/Game/feedback/skillFeedbackTypes.ts` | Snapshots, samplers, states | **Add** `PassageSegmentState`, `FlowStreakState` — `PassageTimingTier` ✅ Slice A |
| Diag | `src/Game/debug/skillFeedbackDiag.ts` | Ring buffer dump | **Extend** with timing tier + segment id |
| Tests | `src/Game/feedback/__tests__/` (113+ tests) | Unit + `shiftCommitPassage.integration.test.ts` | **Expand** per §8 |

**Ignition clock today:** `GameplayFeedbackSystem` fires on `waterData.centerRowEntity !== skillFeedback.lastCenterRowEntity` (row cross), while `updateContactWindow` samples every frame into `passageFlow` until reset on cross.

### 4.2 Physics & input

| Piece | Location | What it does today | Change scope |
|-------|----------|-------------------|--------------|
| Swimmer physics | `src/systems/PhysicsSystem/SwimmerPhysicsSystem.ts` | Tap impulse, water current advection, pin damping | **Medium** — bounce disruptor, pin strict |
| Hyper-casual tap | `src/Game/characters/swimmerHyperCasualPhysics.ts` | Column travel, pinned escape, streak mult on impulse | **Medium** — decouple streak mult from flow streak |
| Tap input | `src/Game/characters/swimmerTapInput.ts` | `rapidTapStreak`, `visualStrokeTier` 1–3 | **Small** — remove HUD/score linkage; keep `rapidTapStreak` impulse always (PT-015) |
| Swimmer tuning | `src/config/swimmerTuning.ts` | `PINNED_*`, `WATER_CURRENT_*`, `tapInputTuning` | **Small** — add `BOUNCE_DISRUPT_*`, pin strict flags |
| Pin collision | `src/Game/collision/swimmerBlockCollision.ts` | `resolvePinnedState`, ceiling bounds | **Small** — stricter escape gates |
| Wall bump VFX | `SwimmerEntityVisualSystem.ts`, `swimmerEntityVisuals.ts` | `wallBumpSquashTimer` squash deformation | **Wire** to failed timing (config exists in `skillFeedback.ts` shift_commit) |
| Kinematic mode | `swimmerKinematicsController.ts` | Tier strikes, combo timer (legacy mode) | **Out of scope** unless `swimmerLocomotionMode === 'kinematic'` |

**Note:** `PINNED_TAP_WATER_CURRENT_SCALE: 0.00` already shipped — non-tap frames may still advect via `WATER_CURRENT_RESPONSE_PER_SECOND`; pin strict mode must zero **all** current coupling while pinned.

### 4.3 Water speed & difficulty

| Piece | Location | What it does today | Change scope |
|-------|----------|-------------------|--------------|
| Session ramp | `beginGameplay.ts` → `computeRaisingSpeedForSession` | 400ms visual→gameplay ease on first tap | **Keep** for start only |
| Stage speed hold | `StageSpeedSystem.ts` + `stageProgression.ts` | Constant `raisingSpeed` per `stageIndex` within FLOW/TENSION/CLIMAX; RELEASE relax accel toward next stage | **Shipped** Track 1 ✅ |
| Water physics | `WaterPhysicsSystem.ts` | Gap blend, flow, calmness — no per-frame speed lerp | **Shipped** — speed owned by `StageSpeedSystem` |
| Water tuning | `swimmerTuning.ts` → `waterPhysicsTuning` | `WATER_SPEED_ACCELERATION_PER_SECOND` | **Deprecated** (unused) |
| Difficulty ramp | `gapDifficultyRamp.ts` | 500-row curve for gaps, runway, segment lengths | **Keep** for geometry; decouple from speed |
| Obstacle movement | `ObstacleSystem.ts` | `raisingSpeed * deltaSeconds` row motion | **Consume** stage speed from `Water` |
| Speed norm for praise | `rowCrossEval.ts` → `normalizeSpeed01` | `raisingSpeed / speedNormMax` | **Keep**; SMOOTH! tier upgrade only |

### 4.4 Path generation & macro pacing

| Piece | Location | What it does today | Rhythm fit |
|-------|----------|-------------------|------------|
| Pacing director | `src/Game/path/pacingDirector.ts` | FLOW/TENSION/CLIMAX/RELEASE row budgets | **Geometry only** — speed owned by `stageIndex` |
| Flow generators | `flowGenerators.ts` | chute, chicane | `L-R-L-R` chicane |
| Tension generators | `tensionGenerators.ts` | funnel, paradox | grouped taps, fork |
| Climax generators | `climaxGenerators.ts` | pinball hop, false wall | pinball = zigzag path |
| Release generators | `releaseGenerators.ts` | cathartic wide interior | HOLD rhythm, stage reward |
| Procedural gaps | `proceduralGaps.ts` | multipath, drift | runway before shifts |
| Run blueprint | `runBlueprint.ts`, `runProgression.ts` | Opening archetypes, weights | Unchanged (L-004) |
| Branch key | `ObstacleRow.spawnDiagBranchKey` | e.g. `directed\|climax\|pinball` | **Passage skill gating** input |

### 4.5 Visual / FX channels (timing feedback)

| Piece | Location | What it does today | Target |
|-------|----------|-------------------|--------|
| Water contact FX | `SwimmerWaterContactFxSystem.ts` | wake spawn, collar foam, clearance tiers | **Trail** = enhanced wake + water specular |
| Water foam render | `buildWaterSurfaceFoamRenderLayers.ts` | speed-reactive foam | **Shine** on perfect |
| Swimmer water FX tuning | `swimmerWaterFxTuning.ts` | `wallBump` burst preset | **Failed** timing burst |
| Cave lighting | `swimmerCaveLightingTuning.ts` | vignette, lane lift | **Streak** local light bump (Layer A) |
| Score HUD combo | `ScoreHudSystem.ts` | ×2/×3 from `visualStrokeTier` | **Replace** with flow streak HUD ✅ Slice A |
| HUD layout | `scoreHudLayout.ts`, `ScoreView-rntge.tsx` | combo badge entities | **Repurpose** for flow streak |

### 4.6 Gap-shift seam — physics authority (PT-016)

**Perfect / acceptable / failed come from collision outcomes sampled per frame, not from feedback timing fractions.**

| Piece | Location | Role in passage timing |
|-------|----------|------------------------|
| `resolveSwimmerAgainstRows` | `swimmerBlockCollision.ts` | Side block (rim), ceiling pin, hard stop — **defines** what clean means |
| `movementBlockedThisFrame` | `SwimmerPhysicsSystem.ts` | Hard block → `hardBlockSeen` → failed |
| `isPinnedFromAbove` | collision + physics | Late pin under closing block → `pinnedSeen` → failed |
| `isSideBlocked` / `isColliding` | collision | Rim scrape → `softScrapeSeen` → acceptable |
| `updatePassageFlowSampler` | `passageFlowScoring.ts` | Accumulates passage outcomes between row crosses |
| `evaluatePassageTimingTier` | `passageTimingEval.ts` | Maps sampler → `perfect` / `acceptable` / `failed` |

**Flappy Dunk basket (gap shift left):** current-row block on shift-side rim; next-row block on opposite side threatens pin from above. Thread clean → perfect. Scrape rim → acceptable. Block or pin → failed.

**Water surface (not timing gates):** `Water.gapBlend`, surface follow, `FLOW_IMPULSE_ON_ROW_CHANGE` — visual/physics feel only; do **not** gate praise from feedback layer.

**Clarification log:** [track2-physics-passage-timing-clarification.md](../visual-design/logs/track2-physics-passage-timing-clarification.md)

---

## 5. Target architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ GENERATION (existing tokens + new RhythmSchema metadata)                 │
│  pacingDirector → macro phase → geometry generators                       │
│  generators emit branchKey + rhythmBeatIndex on rows                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHYSICS (stage-constant speed, RELEASE ramp, pin strict, bounce)         │
│  StageSpeedSystem / WaterPhysicsSystem / SwimmerPhysicsSystem             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TIMING (physics-outcome tier — authoritative for shift_commit ✅)         │
│  PassageFlowSampler per inter-row window → PassageTimingTier at cross    │
│  optional PassageSegment id for Track 3 flow streak / diag only          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FEEDBACK (derived only from timing tier + path skill id)                 │
│  FlowStreakState → trail + HUD + praise copy + +N multiplier             │
│  praiseRouter → word slots (unchanged transport)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.1 New modules (proposed paths)

| Module | Responsibility |
|--------|----------------|
| `src/config/stageProgression.ts` | Stage constant speed + RELEASE relax accel + per-stage increment |
| `src/config/flowStreak.ts` | Copy ladder, trail colors, multiplier steps, REST dim rule (PT-011) |
| `src/config/rhythmSchema.ts` | Beat pattern IDs, break rules, phase allowlists |
| `src/Game/feedback/passageSegment.ts` | *(optional Track 3)* segment id for flow streak / diag — not a timing rule |
| `src/Game/feedback/passageTimingEval.ts` | perfect/acceptable/failed from `PassageFlowSampler` ✅ Slice A (PT-016) |
| `src/Game/feedback/flowStreak.ts` | streak increment/break, copy tier for router |
| `src/Game/feedback/zigzagPassageDetection.ts` | Geometry zigzag on alternating Δcenter (replaces tap zigzag) |
| `src/systems/FlowTrailVisualSystem.ts` (or extend water FX) | Trail persistence from streak state |
| `src/systems/PhysicsSystem/StageSpeedSystem.ts` | Constant speed per `stageIndex`; RELEASE relax ramp; step on RELEASE→FLOW ✅ Track 1 |

---

## 6. Pillar-by-pillar mapping (detailed)

### Pillar A — Passage-defined skills (PT-001)

**Philosophy:** The player learns **where** the seam is on the path (pinball hop row, chicane break, funnel neck), not **when** an arbitrary row counter fires praise.

| Skill ID | Current detector | Path gate (today) | Required change | Scope |
|----------|------------------|-------------------|-----------------|-------|
| `shift_commit` | `evaluateShiftCommit` | `centerDeltaCols`, not wide-open | `passageTimingEval` perfect vs acceptable ✅ Slice A; SMOOTH! = perfect + speed/diff | **Done** |
| `snap_transfer` | `detectSnapTransfer` | pinhole→flare topology | Require timing tier ≥ acceptable at snap row | **S** |
| `cross_sweep` | `detectSteerPraise` | monotonic travel | Same | **S** |
| `slalom_block` | `detectSteerPraise` | `branchKey` chicane | Same | **S** |
| `fork_clean` | `detectSteerPraise` | paradox split | Same | **S** |
| `zigzag_passage` | *disabled* `zigzag_chain` | alternating Δcenter | New `zigzagPassageDetection.ts`; disable `zigzag_tap` | **M** |
| `near_miss` | `nearMissDetection` | pin threat + tap | Unchanged | — |
| `tap_coach` / `pin_saved` | `tapCoachDetection` | pin latch grace | Unchanged; physics strict separately | — |
| `curve_ride` | *none* | clean thread, no scrape | **New** skill — optional; physics sampler only (PT-016) | **L** |
| `lane_hold` | *none* | monotonic, clean passage | **New** — rewards reading | **L** |
| `thread` | *partial* snap | pinhole W≤1 | Stricter child of snap | **S** |
| `late_commit` | *none* | — | **Rejected** — timing is physics-outcome, not blend % (PT-016) | — |
| `break_recovery` | *implicit* acceptable | scrape then center | Maps to acceptable — no streak | **S** |

**Validations:**
- Pinball 3-row integration (`shiftCommitPassage.integration.test.ts`) still passes for acceptable; perfect requires no `softScrapeSeen`.
- Wide chute drift → silence (existing).
- Passive conveyor (`isPassiveGapConveyor`) → no steer praise (existing).

**Invalidations:**
- ZIG-ZAG! on straight chute with alt-taps (current `zigzag_tap` — **must stop**).
- NICE! on identical adjacent gaps (`SKIP_STEER_ON_IDENTICAL_GAPS` — keep).

**Edge cases:**
- Multipath: segment keyed by `branchKey` + taken lane cluster; praise only on branch swimmer occupies.
- Fork: two valid passages — perfect on taken branch only.
- False wall squeeze: same physics sampler rules; tune collision if rim/pin read is wrong on device.

---

### Pillar B — Perfect / acceptable / failed timing (PT-003)

**Philosophy:** Three tiers drive **all** sensory channels. Words are optional; trail/bounce are mandatory.

| Tier | Detection rule (target) | Praise word | Trail | Bounce | Streak |
|------|-------------------------|-------------|-------|--------|--------|
| **perfect** | `passageIsClean` + steer proof + gap-shift topology + `crossQualified` | tiered copy | ON / extend | no | +1 |
| **acceptable** | crossQualified, no hard block, soft scrape OK | **silence** (PT-012) | OFF | light or none | break |
| **failed** | `hardBlockSeen` or `pinnedSeen` in passage before cross | silence | OFF | **yes** | break |

**Current → target mapping:**

| Signal | Current use | Target use |
|--------|-------------|------------|
| `passageFlowIntact` | shift_commit reject | acceptable minimum |
| `passageIsClean` | SMOOTH! tier gate | **perfect** requirement |
| `hygiene01` | tier upgrade for MAJESTIC etc. | **secondary** polish on perfect only |
| `crossQualified` | steer family gate | acceptable minimum |
| `movementBlockedThisFrame` | `hardBlockSeen` | failed trigger |
| `wallBumpSquashDurationSec` in config | unused in physics? | failed bounce duration |

**Change scope:** **Shipped** for `shift_commit` — `passageTimingEval.ts` + `evaluateShiftCommit` ✅ Slice A. Extend same sampler rules to other steer/snap skills (Track 2 remainder / Track 3).

**Tests:**
- `passageTimingEval.test.ts` — tier matrix from sampler ✅
- `shiftCommitPassage.integration.test.ts` — rim scrape → acceptable not perfect ✅
- `failedTimingBounce.integration.test.ts` — hard block sets bounce timer (device/manual)

**Edge cases:**
- Failed then cross row via momentum — streak already broken; no word.
- Perfect near_miss same frame — dual word stack OK; trail only if perfect passage (router rule).
- Session speed ramp active (`speedRampStartMs`) — downgrade perfect → acceptable (shipped).
- Zero taps, water current threads clean — still `perfect` (PT-016).

---

### Pillar C — Stage speed (PT-002, PT-009)

**Philosophy:** Player internalizes **one water speed per stage** (full directed-path loop). Macro phases (FLOW/TENSION/CLIMAX) change geometry, not speed. RELEASE is exhale + **visible speed ramp** telegraphing the next stage; the snap on RELEASE→FLOW is predictable.

| Stage moment | `raisingSpeed` behavior | Player feel |
|--------------|---------------------------|-------------|
| FLOW / TENSION / CLIMAX | `computeStageConstantSpeed(base, stageIndex)` — flat hold | Steady timing chapter |
| RELEASE enter | Relax accel (`STAGE_RELAX_ACCEL_PER_SECOND`) toward next stage target | Water speeds up — "next level is faster" |
| RELEASE → FLOW boundary | `stageIndex++`; snap to new constant (+`STAGE_SPEED_INCREMENT` per stage) | New chapter speed |

**Shipped systems:**

| File | Role |
|------|------|
| `stageProgression.ts` | `STAGE_SPEED_INCREMENT`, `STAGE_RELAX_ACCEL_PER_SECOND`, `computeStageConstantSpeed` |
| `StageSpeedSystem.ts` | Applies hold + RELEASE ramp; steps on phase boundary |
| `WaterPhysicsSystem.ts` | Gap/flow/calmness only — no speed lerp |
| `gapDifficultyRamp.ts` | Geometry only — no speed coupling |

**Validations:**
- Time-per-row flat ±1% within FLOW/TENSION/CLIMAX of a stage
- Speed step only on RELEASE→FLOW (`stageIndex` increment)
- RELEASE shows visible ramp before next stage hold

**Invalidations:**
- `WATER_SPEED_ACCELERATION_PER_SECOND` continuous ramp during play
- Per-macro-phase speed steps within one loop (superseded by stage model)

**Edge cases:**
- Death restart mid-cycle — `stageIndex` from session, not reset
- Start session ramp — first 400ms freezes perfect timing eval (Slice A)
- Game over / start_ready — speed 0

---

### Pillar D — Trail + shine + bounce (PT-005, PT-006)

**Philosophy:** Perfect = **victory in dark cave** (bright trail, water shine). Failed = **body disruption** (bounce, dull).

| Channel | Current | Target | Owner system |
|---------|---------|--------|--------------|
| Trail | `wakeSpawnTimer` in water FX | Sustained wake + specular while `flowStreak ≥ 1` | `SwimmerWaterContactFxSystem` or `FlowTrailVisualSystem` |
| Shine | clearance-based foam | multiply foam/highlights by `flowStreak` tier | `buildWaterSurfaceFoamRenderLayers`, shader uniforms |
| Bounce | `wallBumpSquashTimer` visual only | Trigger on failed + `movementBlocked`; velocity impulse opposite block | `SwimmerPhysicsSystem` + visual |
| Dull | N/A | trail off, `calmness` bump down on fail | `WaterPhysicsSystem` |

**Config:** `src/config/flowStreak.ts` + extend `swimmerWaterFxTuning.ts`

**Scope:** **Large** (VFX), **Medium** (physics bounce)

**Edge cases:**
- Trail at 60fps low-end — cap particles, streak still visible via collar + shader
- World skin (Phase 4) — trail color from reactive token table
- Death — clear trail immediately on `RestartGameplaySystem`

---

### Pillar E — Flow streak (PT-004)

**Philosophy:** Dune comet — **consecutive perfect passages** escalate score and copy; one acceptable/failed breaks it.

| State field | Location (proposed) | Rules |
|-------------|---------------------|-------|
| `flowStreakCount` | `GameplayFeedbackManager.skillFeedback` or `FlowStreakState` | +1 on perfect passage end |
| `flowStreakTier` | derived | maps to copy + trail color + score mult |
| `lastPerfectMs` | telemetry | diag |

**Break triggers:** hard block, pin in passage, death  
**REST (PT-011):** dim trail; streak count **unchanged** — no increment in corridor  
**Near miss (PT-013):** does **not** break streak

**Replace:**
| Retire | Replacement |
|--------|-------------|
| HUD ×2/×3 from `visualStrokeTier` (`ScoreHudSystem`) | `flowStreakCount` display |
| `rapidTapStreak` → score / HUD / `praiseBonus` | **Keep** impulse mult in `swimmerTapInput` + `swimmerHyperCasualPhysics` always (PT-015) |
| `combo_2` / `combo_3` copy keys | `flow_streak_2` … `flow_streak_5` |

**Scope:** **Medium**

**Tests:**
- `flowStreak.test.ts` — perfect×3, fail break, REST preserve
- `praiseRouter.test.ts` — escalated copy at streak 5

---

### Pillar F — Rhythm schema & generators (PT-008)

**Philosophy:** Paths encode **tap contracts**; generators place seams on beats; breaks are telegraphed.

| Rhythm ID | Tap contract | Existing generator | Beat placement |
|-----------|--------------|-------------------|----------------|
| `HOLD` | none | `releaseGenerators` | open corridor |
| `TAP-TAP` | repeated escape | ceiling tension rows | per pin row |
| `L-R-L-R` | alternate | `climaxPinball*`, chicane | hop + drift rows |
| `L-L-R` | group then switch | funnel exit | neck row |
| `PAUSE-TAP` | skip one beat | **new** CLIMAX insert | after 2× motif |
| `SWEEP` | one commit | cross-lane monotonic | multi-row |
| `SNAP` | late commit | pinhole flare | snap row |

**Implementation phases:**
1. **Annotate** rows with `rhythmBeatIndex` in spawn diag (no gameplay change)
2. **Validate** playable at S1/S2/S3 via headless sim
3. **Insert** PAUSE-TAP segments in CLIMAX only

**Files:** `rhythmSchema.ts`, `obstacleRowGenDiag.ts`, generator files, tests in `src/Game/path/__tests__/`

**Scope:** **Large** — Track 4 only after Tracks 1–3 ship

**Invalidations:**
- Rhythm break in FLOW hook (first 15s)
- Break without 2 prior motif repeats

---

### Pillar G — Pin strict & snappy fail (companion to PT-006)

**Philosophy:** Pin is **crisis**, not grind. **TAP coach stays** (PT-014 — gate policy deferred).

| Mechanism | Current | Target |
|-----------|---------|--------|
| Water current while pinned | damped; tap frame scale 0 | **zero** lateral advection unless tap impulse |
| Escape | tap mult + slide columns | higher `PINNED_ESCAPE_MIN_*` at high tier |
| SAVED vs Near Miss | latch grace ms | **keep** — aligns with strict pin |
| Pinned + crossQualified | blocks steer praise | **keep** |

**Files:** `SwimmerPhysicsSystem.ts`, `swimmerHyperCasualPhysics.ts`, `swimmerTuning.ts`

**Scope:** **Medium**

**Tests:** extend pinned escape tests; manual device checklist

---

## 7. Skill copy deck (passage-timing authoritative)

| Key | Copy | When | Streak gate |
|-----|------|------|-------------|
| `shift_commit` | NICE! | perfect shift | ≥1 |
| `shift_commit_smooth` | SMOOTH! | perfect + clean + speed/diff | ≥1 |
| `flow_streak_2` | ×2 flow | HUD | streak 2 |
| `flow_streak_3` | ON FIRE! | word | streak 3 |
| `flow_streak_5` | UNSTOPPABLE! | word | streak 5 |
| `zigzag_passage` | ZIG-ZAG! | alternating seam path | ≥1 |
| `zigzag_passage_king` | ZIG-ZAG KING! | perfect zigzag + streak | ≥3 |
| *existing* snap/surf/slalom/fork | unchanged | path + perfect/acceptable rules | per family |

**Deprecate:** `zigzag_tap` family, `combo_2`/`combo_3` tap HUD keys (after flow streak ships)

---

## 8. Test matrix (complete)

### 8.1 Unit (pure worklets)

| Test file | Covers |
|-----------|--------|
| `passageTimingEval.test.ts` | tier matrix from sampler ✅ |
| `passageSegment.test.ts` | **NEW** — FSM open/close |
| `flowStreak.test.ts` | **NEW** — increment/break/preserve REST |
| `passageFlowScoring.test.ts` | existing — extend hard/soft |
| `shiftCommitPassage.integration.test.ts` | perfect vs acceptable scrape |
| `zigzagPassageDetection.test.ts` | **NEW** — geometry only |
| `zigzagTapDetection.test.ts` | mark deprecated / remove after cutover |
| `praiseRouter.test.ts` | streak copy priority |
| `skillSurvivalGates.test.ts` | tier-aware commit window |

### 8.2 Integration / device

| # | Scenario | Expected |
|---|----------|----------|
| D1 | Clean pinball seam at S2 | perfect, trail on, NICE! |
| D2 | Rim scrape then cross | acceptable, no trail, no word |
| D3 | Side hard block before cross | bounce, streak 0 |
| D4 | 3 perfect pinball → 1 fail | streak resets, trail dies |
| D5 | RELEASE corridor | GREAT! (Phase 2), streak preserved (dim) |
| D6 | Alt-tap on straight chute | no ZIG-ZAG |
| D7 | Pin + water | no passive slide out without taps |
| D8 | RELEASE ramp then stage step | relax accel in RELEASE; snap +`stageIndex` on RELEASE→FLOW |

---

## 9. Implementation tracks (ordered)

```
Track 1 Physics honesty ──► Track 2 Timing eval ──► Track 3 Flow streak + trail
                                                        │
Track 4 Rhythm schema ◄─── (after 1–3 feel good) ─────┘
```

### Track 1 — Physics honesty

**Goal:** Body tells truth before more praise.

| Task | Files | Exit |
|------|-------|------|
| T1.1 Pin strict lateral | `SwimmerPhysicsSystem`, `swimmerTuning` | D7 pass ✅ |
| T1.2 Bounce disruptor on failed | `SwimmerPhysicsSystem`, `passageTimingEval` hook | D3 visible bounce ✅ (physics hook; full timing gate Track 2) |
| T1.3 Stage speed hold | `StageSpeedSystem`, `stageProgression.ts`, `WaterPhysicsSystem` | D8 pass ✅ |
| T1.4 Remove continuous accel | `WaterPhysicsSystem`, `waterPhysicsTuning` | speed flat within stage ✅ |

**Estimate:** 1 sprint

---

### Track 2 — Passage timing evaluation

**Goal:** `PassageTimingTier` is authoritative from **physics outcomes** (PT-016).

| Task | Files | Exit |
|------|-------|------|
| T2.1 `passageSegment.ts` FSM | new + `GameplayFeedbackSystem` | *(optional Track 3)* diag segment id for flow streak |
| T2.2 `passageTimingEval.ts` | new + `skillFeedbackTypes` | unit matrix green ✅ Slice A |
| T2.3 Refactor `evaluateShiftCommit` | `steerPraiseDetection` | integration tests updated ✅ Slice A |
| ~~T2.4 Gap blend commit window~~ | — | **Rejected (PT-016)** — physics sampler is authoritative; removed `passageTiming.ts` |
| T2.5 Disable `zigzag_tap` | config + router | D6 no false zigzag ✅ Slice A |
| T2.6 Extend tier gate to snap/steer families | `snapTransferDetection`, `steerPraiseDetection` | acceptable = silence on all passage skills |

**Track 2 core (`shift_commit`) shipped** with Slice A. **Track 3 Slice A** shipped (flow streak state, HUD, bonus mult). Next: T2.6, T3.2 trail, or T3.4 zigzag_passage.

**Track 3 Slice A deferred (see [track3-slice-a-flow-streak-handoff.md](../visual-design/logs/track3-slice-a-flow-streak-handoff.md)):**
- T2.6 — tier gate on snap/steer families (scrape silence)
- T3.2 — trail VFX / comet wake
- T3.4 — `zigzag_passage`
- T3.5 — streak word escalation (20+ copy pool — founder decision pending)
- PT-011 — REST corridor trail dim
- Device matrix D1–D8 founder pass
- Known inconsistency: scrape cross_sweep may still praise while seam streak broke

**Estimate:** Track 3 remainder — 1 sprint

---

### Track 3 — Flow streak + trail + HUD

**Goal:** Dune-style stateful reward.

| Task | Files | Exit |
|------|-------|------|
| T3.1 `flowStreak.ts` state machine | `GameplayFeedbackManager`, config | unit tests ✅ Slice A |
| T3.2 Trail VFX | water FX / new system | D1/D4 visible |
| T3.3 Replace HUD combo | `ScoreHudSystem`, `ScoreView` — drop `visualStrokeTier` ×2/×3 | HUD shows flow streak only ✅ Slice A |
| T3.3b Decouple tap streak from score | `swimmerTapInput`, `praiseBonus`, `ScoreHudSystem` — **keep** `rapidTapStreak` impulse always (PT-015) | tap mult affects steer only; HUD+bonus use flow streak ✅ Slice A |
| T3.4 Re-enable `zigzag_chain` → `zigzagPassageDetection` | feedback + config | pinball only |
| T3.5 Praise router escalation | `praiseRouter`, `flowStreak` config | D4 copy tiers |

**Estimate:** 1–2 sprints

---

### Track 4 — Rhythm schema + generator beats

**Goal:** Procedural paths declare tap contracts.

| Task | Files | Exit |
|------|-------|------|
| T4.1 `rhythmSchema.ts` + row metadata | path generators | diag beat index |
| T4.2 Playability validator at S1–S3 | test harness | no impossible pinball |
| T4.3 PAUSE-TAP CLIMAX inserts | `climaxGenerators` | device: break after motif |
| T4.4 Telegraphed break rows | art warning tops + RELEASE breather | readable 0.5s |

**Estimate:** 2+ sprints

---

## 10. Relationship to player-experience-roadmap phases

| PX roadmap phase | Passage-timing interaction |
|------------------|---------------------------|
| **P0 Audit** | ✅ hooks exist — add passage-timing doc pointer |
| **P1 Skill juice** | **Superseded by Tracks 1–3** — flow streak replaces tap combo follow-up |
| **P2 Rest + coins** | GREAT!/PERFECT! on RELEASE; flow streak **preserve** rule; speed hold in REST |
| **P3–P4 Worlds** | Trail/shine colors from world reactive tokens — no timing logic change |
| **P5 Items** | Jet ribbon ×2 must stack with flow streak policy (define: additive or separate) |
| **P6 Pinball set-piece** | Paddle hit = `zigzag_passage` + clean physics passage |
| **P7 Tuning** | `flowStreak.ts` + collision/sampler fidelity device passes |

---

## 11. Config SSOT index (after refactor)

| Concern | File |
|---------|------|
| Praise copy/thresholds | `src/config/skillFeedback.ts` |
| Passage timing tiers | `passageTimingEval.ts` + `passageFlowScoring.ts` — **no separate timing config** (PT-016) |
| Stage speed hold + RELEASE ramp | `src/config/stageProgression.ts` + `StageSpeedSystem.ts` |
| Flow streak / trail | `src/config/flowStreak.ts` (**new**) |
| Rhythm beats | `src/config/rhythmSchema.ts` (**new**) |
| Physics pin/bounce | `src/config/swimmerTuning.ts` |
| Flash layout | `src/config/gameplayFeedback.ts` |
| Water shader runtime | `src/config/swimmerTuning.ts` → `waterPhysicsTuning` |

---

## 12. Locked founder decisions (2026-07-02)

Signed off — implement as **PT-011…PT-015** in §2.

| ID | Decision | Founder answer |
|----|----------|----------------|
| **PT-011** | REST + flow streak | Dim trail; **do not** break streak |
| **PT-012** | Acceptable timing feedback | **Silence** — no word, no +N flyout |
| **PT-013** | Near miss + streak | **Does not** break streak |
| **PT-014** | TAP coach after Track 1 | **Keep** as shipped; gate policy deferred |
| **PT-015** | `rapidTapStreak` physics mult | **Always** on (not pin-only); **no** score / HUD / praise bonus linkage |

---

## Document changelog

| Date | Change |
|------|--------|
| 2026-07-02 | v1 — initial master roadmap from passage-timing design session |
| 2026-07-02 | v1.1 — PT-011…PT-015 locked (founder sign-off on REST, acceptable silence, near miss, TAP coach, rapidTapStreak) |
| 2026-07-03 | v1.2 — Stage speed model documented (`StageSpeedSystem` supersedes draft `SpeedTierSystem`); Track 2 Slice A shipped (`passageTimingEval`, `shift_commit` tier gate, `zigzag_tap` off) |
| 2026-07-03 | v1.3 — **PT-016** physics-defined passage timing; rejected `gapBlend` config gates; removed `passageTiming.ts`; clarification [log](../visual-design/logs/track2-physics-passage-timing-clarification.md) |
| 2026-07-03 | v1.4 — **Track 3 Slice A** — `flowStreak.ts`, uncapped HUD ×N (first perfect = ×2), praise bonus mult, diag fields; [handoff](../visual-design/logs/track3-slice-a-flow-streak-handoff.md) |

---

*When a track ships, check boxes in §9 and append a handoff log. Tune passage fidelity in collision + `swimmerTuning.ts`; tune flow streak in `flowStreak.ts` (Track 3).*
