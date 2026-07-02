# Run-Level Progression — Design Spec

**Status:** Phases 1–5 complete (2026-06-28). **Next:** post–Phase 5 polish — see [Post-Phase 5](#post-phase-5--founder-notes--next-tracks) (T-005 framing, T-003/T-004 tuning, optional T-007).  
**Scope:** How each **run** (tap Start → play → die → retry) feels different from the last.  
**Out of scope:** New core mechanics, biome rule-twists, character gameplay modifiers, monetization, handcrafted level mode.

**Speed / timing within a run:** Macro FLOW/TENSION/CLIMAX/RELEASE phases here supply **geometry**; discrete **water speed tiers** per phase are defined in [passage-timing-roadmap.md](./passage-timing-roadmap.md) (PT-002, PT-009). Do not add per-frame speed ramp without updating that doc.

---

## Problem

The game already has strong **within-run** pacing (FLOW → TENSION → CLIMAX → RELEASE macro cycles, phase-specific generators, difficulty ramp over ~500 spawned rows, `pathRunId` re-roll per cycle).

On **every restart**, the same script plays from row 0:

- `totalRowsGenerated` resets to 0
- Template context is wiped; new random `runId`
- Player always enters **cycle 0, FLOW phase, warm chute opening**

Micro-layout varies, but the **first act** of every run reads the same. Retries feel like rewinding the same movie.

**Target feel:** Run #47 should not open like run #3. Same one-thumb control, different **Run Identity** in the first 5–15 seconds and across macro chapters.

---

## Design Principle

> **Progressive infinite** = run-to-run identity + within-run chapters + expanding unlock *pool* — not harder forever, not pure random chaos.

| Layer | What it fixes | In scope now? |
|-------|---------------|---------------|
| **Run Identity** | Retry sameness | **Yes — primary focus** |
| **Session pacing (boss cadence)** | Mid-run fatigue | **Yes — cycle-based** |
| **Attempt memory** | Same death, same frustration on retry | **Yes — lightweight** |
| **Milestone pool unlocks** | Long-term reason to return | **Yes — expands run variety pool only** |
| Biome visuals / swim animation | Collection & atmosphere | Visual only — no generator weights |
| Character skins | Collection | No gameplay tie-in |
| World / mechanic unlocks | New verbs | **Future — out of scope** |
| Adaptive death analytics | Weight blueprint by death context | **Partial — v1 breather boost only (T-003)** |

---

## Locked Decisions

### 1. First run is fixed (for now)

- **Run attempt #1** (first Start of **app session**): always uses the **default warm opening** blueprint — `warmChute` + `flowHeavy` + `climaxPreference: mixed`. Generators consume blueprint from Phase 2 onward.
- Variety begins from **run attempt #2 onward** (retries and subsequent Starts after game over / title return).
- **Locked (T-001):** Per **session** — `runAttemptIndex` resets when `GameSession` entity is recreated (cold start). Not per install forever.
- **TODO (future):** Onboarding arc before variety; A/B per-install vs per-session.

### 2. Boss cadence is cycle-based

- Signature set-pieces fire on a **macro cycle schedule** (e.g. every 2nd CLIMAX, or every N completed FLOW→RELEASE cycles) — not wall-clock seconds.
- **TODO (future):** Tune cycle count, which phase triggers the beat, and whether cadence itself ramps with lifetime attempts or best score.

### 3. Characters, biomes, and mechanics are separate tracks

| Track | What it is | Affects run generation? |
|-------|------------|-------------------------|
| **Swimmer character** | Skin, float animation, swim personality | **No** — cosmetic / locomotion presentation only |
| **Biome** | Block art, foam, water tint, ambient FX, floating/swim *look* | **No gameplay weights** — visual and animation identity only |
| **World / mechanic unlocks** | New obstacle behaviors, rules, verbs | **Future** — designer-owned, not part of this spec |
| **Run progression** | Blueprint, archetypes, boss patterns, pool unlocks | **Yes — this document** |

Do not tie Run Blueprint weights to equipped skin or active biome.

### 4. Death-context weighting (v1 shipped, full tuning deferred)

- Pinball currently reads as one of the **easier** climax patterns; 1–2 column gaps may be harder in practice.
- **Shipped (Phase 5):** Death telemetry on game over (`phase`, `generator` tag, `score`); session `deathHistory[3]`; retry breather weight boost when all last 3 deaths are below `ATTEMPT_MEMORY_LOW_SCORE_THRESHOLD` (200) and breather is unlocked.
- **Deferred:** Generator-specific penalties (e.g. reduce pinball CLIMAX weight after 3× pinball deaths) — validate tags in play before tuning (T-003).

---

## Current System Reference (implementation baseline)

| Concern | Location |
|---------|----------|
| **Run blueprint types + roll** | `src/Game/path/runBlueprint.ts` |
| **Blueprint pools + weights** | `src/config/runProgression.ts` |
| **Session storage (`sessionSeed`, `runAttemptIndex`, `runBlueprint`)** | `src/Game/ecs-components/GameSession.ts` |
| **Roll on first Start / title return** | `src/Game/session/beginGameplay.ts` → `assignBlueprintForNewRun(..., 'begin')` |
| **Roll on death Retry** | `src/systems/RestartGameplaySystem.ts` → `assignBlueprintForNewRun(..., 'retry')` |
| **Unit tests (determinism, first run, lifecycle)** | `src/Game/path/__tests__/runBlueprint.test.ts` |
| Macro phase cycle | `src/Game/path/pacingDirector.ts` |
| Phase row counts + difficulty ramp | `src/config/gapDifficultyRamp.ts` |
| FLOW chute / chicane | `src/Game/path/flowGenerators.ts` |
| TENSION funnel / paradox | `src/Game/path/tensionGenerators.ts` |
| CLIMAX pinball / false wall | `src/Game/path/climaxGenerators.ts` |
| RELEASE cathartic strip | `src/Game/path/releaseGenerators.ts` |
| Multipath procedural gaps | `src/Game/path/proceduralGaps.ts` |
| Opening archetype + FLOW opening rows | `src/Game/path/openingArchetype.ts`, `src/Game/path/flowOpeningRows.ts` |
| Cycle personality + pacing ctx | `src/Game/path/cyclePersonality.ts` |
| Row spawning + template routing | `src/systems/PhysicsSystem/ObstacleSystem.ts` |
| Restart reset (`totalRowsGenerated = 0`) | `src/systems/RestartGameplaySystem.ts` |
| Start / phase transition | `src/Game/session/beginGameplay.ts` |
| **Gameplay grid (SSOT)** | `src/Layout.ts` → `LAYOUT_CONSTANTS.COLUMNS` (**8** cols) |
| Signature cadence + rhythm boss | `src/Game/path/signatureCadence.ts` |
| Milestone pools + weight builders | `src/Game/path/runProgressionPools.ts` |
| Death telemetry + attempt memory | `src/Game/path/deathTelemetry.ts` |
| Persist best score + lifetime runs | `src/Game/persistence/runProgressionStorage.ts` |
| RN-thread persist bridge (game over) | `src/Game/persistence/persistRunFinishedRunBridge.ts` |

**Grid SSOT:** Production infinite run uses **`LAYOUT_CONSTANTS.COLUMNS`** from [`src/Layout.ts`](../../src/Layout.ts) (currently **8**). Do not hardcode column counts in docs or generators. JSON silhouette art templates may use a different art grid — see T-011.

**Hooks:** Phases 1–5 wired — blueprint roll, opening routing (incl. `breather` / `earlyFork`), cycle personality, CLIMAX preference, signature cadence, milestone pools, attempt memory.

---

## Core Concept: Run Blueprint

One deterministic **Run Blueprint** is rolled per run (except first-run fixed opening). It defines identity for the entire attempt.

```typescript
/** Implemented in src/Game/path/runBlueprint.ts */
type OpeningArchetype =
  | 'warmChute'        // default; used for first run
  | 'fastChicane'      // skip long chute; slalom from ~row 3–5
  | 'earlyFork'        // multipath / paradox flavor in first ~15s equivalent
  | 'leftBias'         // chute seeded left (cols 2–3)
  | 'rightBias'        // chute seeded right (cols 11–12)
  | 'breather';        // extended readable corridor before first spike

type CyclePersonality =
  | 'flowHeavy'        // longer FLOW budget first cycle
  | 'tensionEarly'     // shorter FLOW, tension arrives sooner
  | 'climaxForward'    // first CLIMAX segment weighted earlier in cycle 1
  | 'shortRelease';    // shorter RELEASE, faster return to tension

type ClimaxPreference = 'pinball' | 'falseWall' | 'mixed';

type SignaturePattern =
  | 'pinballHop'
  | 'falseWallFakeout'
  | 'paradoxNoRunway'
  | 'mirrorChicane';

type RunBlueprint = {
  runSeed: number;                    // u32; master seed for this run
  runAttemptIndex: number;            // monotonic per session (1 = first run)
  openingArchetype: OpeningArchetype;
  cyclePersonality: CyclePersonality;
  climaxPreference: ClimaxPreference;
  /** Which signature patterns are eligible this run (grows via milestones) */
  signaturePatternPool: SignaturePattern[];
  /** Cycle index (1-based) of first forced signature beat; 0 = none this run */
  firstSignatureAtCycle: number;
  /** Every N completed macro cycles, force a signature beat */
  signatureEveryNCycles: number;
};
```

**Determinism:** Rolls use `mixU32(sessionSeed, runAttemptIndex, salt)` — worklet-safe, replayable, unit-testable. `pathRunId` on template init mirrors `session.runSeed`; per-cycle re-rolls use `mixU32(baseRunSeed, cycleStartTotalRows, salt)`.

**Storage:** Flat fields on `GameSession` — `sessionSeed`, `runAttemptIndex`, `runSeed`, `runBlueprint`. Re-rolled on Start (after first run) and on Retry. `resetGameSessionToStartReady` does **not** reset attempt index.

---

## Opening Archetype Library

Reuse existing generators. New code is **routing only** — no new physics.

| Archetype | Player sees | Implementation sketch |
|-----------|-------------|------------------------|
| `warmChute` | Centered straight corridor, then chicane | Current default FLOW path |
| `fastChicane` | Zigzag almost immediately | Cap `flowChuteRowsTarget` to 3–5 via blueprint |
| `earlyFork` | Two lanes visible early | Enter multipath or paradox segment early in cycle 1 (row budget ~12–20) |
| `leftBias` | Corridor hugs left wall | Seed chute center from `flowGapCenterBounds` left range (e.g. cols 1–2 on 8–9 col grid) |
| `rightBias` | Corridor hugs right wall | Seed chute center from `flowGapCenterBounds` right range (e.g. cols 5–6 / 6–7) |
| `breather` | Wide, calm opening | Wider initial gap + longer chute cap before first lateral shift |

**First run:** always `warmChute` + default `cyclePersonality` + `climaxPreference: mixed`.

**Retries (attempt ≥ 2):** weighted roll from unlocked archetype pool (see Milestones).

---

## Cycle Personality (first macro cycle)

Adjust **first cycle only** phase row budgets via existing `pacingCycleLayoutFromCycleStart`, with `runSeed` folded into pick salts:

| Personality | Effect on cycle 1 |
|-------------|-------------------|
| `flowHeavy` | +15–25% FLOW rows, −10% TENSION |
| `tensionEarly` | −20% FLOW, TENSION starts ~8–12 rows sooner |
| `climaxForward` | CLIMAX segment in cycle 1 uses preferred generator (`climaxPreference`) |
| `shortRelease` | RELEASE at hard minimum; next cycle tension arrives faster |

Later cycles use normal ramp keyed to `totalRowsGenerated` (unchanged long-run difficulty curve).

---

## Boss Cadence — Cycle-Based Signature Beats

**Knife Hit analogue:** not infinite randomness — a **predictable rhythm of pattern breaks**.

Every **N completed macro cycles** (starting at `firstSignatureAtCycle`), force one **Signature Pattern** during CLIMAX (or TENSION if cycle personality demands):

| Pattern | Player read | Generator |
|---------|-------------|-----------|
| `pinballHop` | Big lateral hop, one obvious commit | `climaxPinballStep` with exaggerated hop |
| `falseWallFakeout` | Wide gap looks safe; squeeze row punishes autopilot | `climaxFalseWallRow` variant |
| `paradoxNoRunway` | Split with minimal duplicate runway | `tensionParadoxSplitRow` with reduced shift runway |
| `mirrorChicane` | Slalom direction reverses mid-block | `flowChicaneNextRow` with flipped `direction` mid-block |

**Telegraph (future polish):** water surge / foam pulse one cycle before — not required for v1.

**Defaults (tunable):**

- `firstSignatureAtCycle = 2`
- `signatureEveryNCycles = 2`
- Pool starts with `{ pinballHop }` only — extra patterns deferred until new boss design (T-010)

**TODO (future):** Expose cadence in config; A/B cycle count vs retention.

---

## Attempt Memory (lightweight retry fairness)

Track last **3 deaths** per session:

```typescript
type DeathContext = {
  phase: 'flow' | 'tension' | 'climax' | 'release';
  generator: string;   // e.g. 'pinball', 'funnel', 'chicane', 'multipath'
  score: number;
};
```

On blueprint roll (attempt ≥ 2):

- ~~If same `generator` appears in 2+ of last 3 deaths → reduce weight on that generator~~ — **deferred** (T-003; validate tags first).
- If `score < ATTEMPT_MEMORY_LOW_SCORE_THRESHOLD` (200) on all last 3 → **+weight** on `breather` opening archetype (×3 when breather is milestone-unlocked).

**Status:** ✅ Shipped (Phase 5). Telemetry in `deathTelemetry.ts`; storage in `recordRunDeathOnGameOver` (`beginGameplay.ts`).

---

## Milestone Pool Unlocks (run variety only)

Unlocks expand what can appear in **Run Blueprint rolls**. They do **not** change character stats, biome rules, or core mechanics.

**Gate:** **`session.bestScore` only** (loaded from AsyncStorage on cold start). `lifetimeRunCount` is persisted separately for analytics — not used for unlocks in v1.

| Milestone (best score) | Unlocks |
|------------------------|---------|
| Default | `warmChute`, `fastChicane`, `leftBias`, `rightBias`, `flowHeavy`, `{ pinballHop }` |
| 300 | `earlyFork` (multipath opening rows) |
| 700 | `breather` (14-row straight chute opening) |
| 1000 | Cycle personality `tensionEarly` |

All thresholds are **`runProgressionTuning.MILESTONE_*`** in [`runProgression.ts`](../../src/config/runProgression.ts) — adjustable tuning constants, not product commitments.

**Explicitly not milestone-gated (founder locked):** extra signature patterns (`falseWallFakeout`, `paradoxNoRunway`, `mirrorChicane`), `shortRelease` / `climaxForward`, biome art, swimmer skins, new obstacle types.

---

## Time Segments (design reference)

Map rows to **felt time** at current `raisingSpeed` when tuning; generation remains row-based.

| Segment | Approx. job |
|---------|-------------|
| Hook (0–5s) | Control works; one satisfying steer |
| Teach (5–15s) | “This run is different” |
| Flow (15–45s) | Confidence + score |
| Spike (45–75s) | First real death pressure |
| Chapter | Signature beat on cycle cadence |
| Deep run (75s+) | Full difficulty ramp |

---

## Architecture (target)

```
GameSession
  sessionSeed: u32
  runAttemptIndex: number          // 0 = never started; 1 = first run (fixed blueprint)
  runSeed: u32
  runBlueprint: RunBlueprint
  bestScore: number                // hydrated from AsyncStorage; updated on new best
  lifetimeRunCount: number          // hydrated + incremented on game over (worklet + AsyncStorage)
  deathHistory: DeathContext[3]     // session-scoped; ring buffer on game over ✅

ObstaclesManager
  totalRowsGenerated               // unchanged — still drives in-run ramp

pacingDirector / gapDifficultyRamp
  pacingCycleLayoutFromCycleStart(cycleStart, runSeed?)
  applyCyclePersonality(blueprint, cycleIndex)

ObstacleSystem
  openingArchetype.ts + flowOpeningRows.ts (first N FLOW rows) ✅
  resolveSignatureBeat(blueprint, cycleIndex, phase)  // Phase 4
  existing generators unchanged — routing only
```

**Roll blueprint (implemented):**

1. `beginGameplay` — `assignBlueprintForNewRun(session, 'begin')`: attempt `0 → 1` fixed blueprint; attempt `≥ 1 → increment + roll`.
2. `restartGameplay` — `assignBlueprintForNewRun(session, 'retry')`: increment + roll; `totalRowsGenerated = 0` unchanged.

**Tests:** `npm test -- --watchAll=false runBlueprint` — determinism, first run `warmChute`, lifecycle modes.

---

## Implementation Phases

### Phase 1 — Run Blueprint + storage (MVP) ✅ (2026-06-27)

- [x] Types + `rollRunBlueprint({ sessionSeed, runAttemptIndex, deathHistory?, unlockedPools? })`
- [x] `createFixedFirstRunBlueprint`, `assignBlueprintForNewRun` (begin / retry modes)
- [x] Persist on `GameSession`; roll on `beginGameplay` + `RestartGameplaySystem`
- [x] First run hardcoded `warmChute` + `flowHeavy` + `mixed`
- [x] Unit tests in `src/Game/path/__tests__/runBlueprint.test.ts`

**Player-visible change:** None yet — blueprint is stored but generators ignore it until Phase 2.

### Phase 2 — Opening archetypes ✅ (2026-06-27)

- [x] Route first N rows through archetype table (`OPENING_ARCHETYPE_MAX_ROWS = 14`)
- [x] Wire `leftBias` / `rightBias` / `fastChicane` / `warmChute` to shared FLOW opening helper
- [x] `runSeed` → `pathRunId` on template init; deterministic per-cycle re-roll
- [x] Production path: `directed` → `baseMultiPathGetRow` opening budget, then multipath
- [x] Unit tests — `openingArchetype.test.ts`, `flowOpeningRows.test.ts`, `flowGenerators.test.ts`
- [x] `breather` / `earlyFork` — **Phase 5** (milestone-gated routing; see below)

**Player-visible change:** Retries (attempt ≥ 2) open with distinct lane read in first ~5–15s. First session Start unchanged (`warmChute`).

### Phase 3 — Cycle personality ✅ (2026-06-28)

- [x] Fold `runSeed` into `pacingCycleLayoutFromCycleStart` for cycle 1 (`runSeed=0` on attempt #1 — identical first chapter)
- [x] `applyCyclePersonality` — cycle-1 phase budget shifts (`flowHeavy` v1 pool)
- [x] `climaxPreference` routes CLIMAX init: `pinball` → free multipath; `falseWall` → 4× solo segment; `mixed` → pinball → false wall
- [x] Unit tests — `cyclePersonality.test.ts`, `climaxPreferenceRouting.test.ts`, extended `pacingDirector.test.ts`

**Player-visible change:** Retries get longer/shorter cycle-1 chapters (`flowHeavy`) and distinct CLIMAX openers. First session Start unchanged.

### Phase 4 — Signature cadence (pinballHop rhythm boss) ✅ (2026-06-28)

- [x] `macroCycleIndex1Based` + `resolveSignaturePattern` in `signatureCadence.ts`
- [x] Extend `PacingRunContext` with signature blueprint fields
- [x] `pinballHop` rhythm block at cycle 2, 4, 6… CLIMAX (attempt #1 included)
- [x] v1 pool: `{ pinballHop }` only — `mirrorChicane` deferred (T-010)
- [x] Config keys in `runProgression.ts`; tests on 8-col grid (`Layout.ts`)

### Phase 5 — Milestones + attempt memory ✅ (2026-06-28)

- [x] `resolveUnlockedPools(bestScore)` — milestones 300 / 700 / 1000 (adjustable in `runProgression.ts`)
- [x] Load `bestScore` + `lifetimeRunCount` from AsyncStorage (`runProgressionStorage.ts`); persist on game over via `scheduleOnRN` bridge
- [x] `deathHistory[3]` on `GameSession`; `recordRunDeathOnGameOver` on UI thread
- [x] Attempt memory v1: low-score death streak → breather weight boost (no generator penalties yet)
- [x] Opening routing: `breather` (14-row chute), `earlyFork` (multipath opening budget)
- [x] Signature pool unchanged: `{ pinballHop }` only
- [x] Unit tests — `runProgressionPools`, `deathTelemetry`, `earlyForkOpening`, extended `runBlueprint`

**Player-visible change:** Retries respect best-score unlocks; early deaths skew toward calmer openings; first session Start unchanged.

**Verify Phase 5:**

```bash
npm test -- --watchAll=false runProgressionPools deathTelemetry runBlueprint openingArchetype flowOpeningRows earlyForkOpening cyclePersonality signatureCadence
```

---

## Implementation Status

### Phase 1 — Run Blueprint + storage ✅ (2026-06-27)

**Done:**

| File | What it does |
|------|----------------|
| `src/config/runProgression.ts` | Default pools, weights, signature cadence constants |
| `src/Game/path/runBlueprint.ts` | Types, `createFixedFirstRunBlueprint`, `rollRunBlueprint`, `assignBlueprintForNewRun` |
| `src/Game/path/__tests__/runBlueprint.test.ts` | 12 tests — determinism, pools, lifecycle |
| `src/Game/ecs-components/GameSession.ts` | `sessionSeed`, `runAttemptIndex`, `runSeed`, `runBlueprint`, `bestScore`, `lifetimeRunCount`, `deathHistory` |
| `src/Game/session/beginGameplay.ts` | Roll on Start; preserve attempt index on title reset |
| `src/systems/RestartGameplaySystem.ts` | Roll on Retry |

**Attempt index lifecycle (locked):**

| Event | `runAttemptIndex` |
|-------|-------------------|
| Session entity created | `0` |
| First `beginGameplay` | `1` (fixed blueprint) |
| Death → Retry | `+1`, roll |
| Restart Game → Start | `+1`, roll |
| `resetGameSessionToStartReady` | unchanged |
| App cold start (new entity) | `0` |

**Not wired yet (intentional / future):**

- Generator-specific attempt-memory penalties (T-003)
- Milestone gates on `lifetimeRunCount` (tracked only)
- AsyncStorage session seed for first-run pacing variety (T-007)
- `mirrorChicane` / extra signature patterns (T-010 — founder: pinballHop only on 8 cols until new boss design)

**Verify Phase 1:** `npm test -- --watchAll=false runBlueprint` — all green.

### Phase 2 — Opening archetypes ✅ (2026-06-27)

**Done:**

| File | What it does |
|------|----------------|
| `src/config/runProgression.ts` | Opening budget (14 rows), fastChicane 3–5 cap, bias roll salts |
| `src/Game/path/openingArchetype.ts` | Column-safe bias ranges + fastChicane cap from `runSeed` |
| `src/Game/path/flowOpeningRows.ts` | Shared chute→chicane state machine + archetype routing |
| `src/Game/path/flowGenerators.ts` | Optional `seedCenter` on first chute row |
| `src/systems/PhysicsSystem/ObstacleSystem.ts` | `directed` opening budget, `selectTemplate` runSeed, cycle re-roll |
| `src/systems/RestartGameplaySystem.ts` | Deterministic template ctx on retry |
| `src/Game/path/__tests__/openingArchetype.test.ts` | Bias ranges, fastChicane cap, determinism |
| `src/Game/path/__tests__/flowOpeningRows.test.ts` | Seam validity per archetype, chicane timing |

**Locked tuning:**

- Opening budget: **14 spawned rows** in FLOW, then normal multipath (`directed`)
- Left/right bias: ranged centers from `flowGapCenterBounds(columnCount)` — left **1–2**, right **5–6** (8 cols) or **6–7** (9 cols)
- fastChicane: **3–5** chute rows before chicane (deterministic roll from `runSeed`)

**Verify Phase 2:** `npm test -- --watchAll=false openingArchetype flowOpeningRows flowGenerators runBlueprint`

**Manual QA (founder, 2026-06):** Warm straight opening **accepted as intended**. Retries read mainly as **lane shift** (left/center/right), not slalom — expected: opening chute cap from `gapDifficultyRamp` (~20–32 rows) exceeds `OPENING_ARCHETYPE_MAX_ROWS` (14), so chicane rarely starts inside the opening window. **Not a Phase 3 blocker.** Optional later: opening-specific chute caps in `runProgression.ts`.

**Tuning layers:** `runProgression.ts` = cross-run identity (opening, cycle personality, CLIMAX preference). `gapDifficultyRamp.ts` = in-run progress (`totalRowsGenerated`, `RUNWAY_DUP`, multipath width, phase lengths). Do not merge `RUNWAY_DUP` into blueprint; Phase 3 adjusts cycle-1 phase budgets only.

### Phase 3 — Cycle personality ✅ (2026-06-28)

**Done:**

| File | What it does |
|------|----------------|
| `src/config/runProgression.ts` | Personality % tuning, false-wall solo 4× multiplier, salts |
| `src/Game/path/cyclePersonality.ts` | `PacingRunContext`, `resolvePacingRunContext`, `applyCyclePersonality`, `resolveCycleLayout` |
| `src/config/gapDifficultyRamp.ts` | `runSeed` on cycle-0 picks; `pathSegmentClimaxFalseWallSoloRows` |
| `src/Game/path/pacingDirector.ts` | Optional `PacingRunContext` on cycle state / phase queries |
| `src/systems/PhysicsSystem/ObstacleSystem.ts` | Template ctx fields, pacing ctx, CLIMAX preference routing |
| `src/systems/RestartGameplaySystem.ts` | Retry template ctx parity |
| `src/Game/path/__tests__/cyclePersonality.test.ts` | Personality budgets, attempt-1 `runSeed=0` |
| `src/Game/path/__tests__/climaxPreferenceRouting.test.ts` | Solo false-wall sizing |
| `src/Game/path/__tests__/pacingDirector.test.ts` | Phase boundaries with `flowHeavy` ctx |

**Locked tuning:**

- Attempt #1 pacing: `runSeed=0` for cycle-1 layout (identical first chapter every session Start)
- `flowHeavy`: +15–25% FLOW, −10% TENSION (cycle 1 only)
- `climaxPreference: falseWall` — sole opener uses **4×** base false-wall rows, clamped to `climaxRows − 4`
- `climaxPreference: pinball` — after pinball segment → multipath (`free`), skips false wall
- `climaxForward` — no extra routing; satisfied by global `climaxPreference` at CLIMAX init
- v1 personality pool: `flowHeavy` only

**Verify Phase 3:** `npm test -- --watchAll=false cyclePersonality pacingDirector climaxPreference runBlueprint`

### Phase 4 — Signature cadence (pinballHop rhythm boss) ✅ (2026-06-28)

**Done:**

| File | What it does |
|------|----------------|
| `src/config/runProgression.ts` | Signature rhythm tuning; v1 pool `{ pinballHop }` only |
| `src/Game/path/signatureCadence.ts` | Cycle index, beat detection, pattern pick, row budget |
| `src/Game/path/cyclePersonality.ts` | `blueprintRunSeed` + signature fields on `PacingRunContext` |
| `src/Game/path/climaxGenerators.ts` | `createSignaturePinballHopState`, transfer chutes, opposite-band SNAP |
| `src/systems/PhysicsSystem/ObstacleSystem.ts` | Signature block, `signatureConsumedCycleIndex`, chute/SNAP runway dup floor |
| `src/Game/debug/signatureBossDebug.ts` | Worklet `console.log` for boss QA (toggle `SIGNATURE_BOSS_DEBUG_ENABLED`) |
| `src/Game/session/beginGameplay.ts` | Sync `pacingRunContext` on first Start (was stale before blueprint) |
| `src/Game/path/__tests__/testGrid.ts` | `TEST_COLS` from `Layout.ts` (8) |
| `src/Game/path/__tests__/signatureCadence.test.ts` | Cadence math, attempt #1 pattern pick |
| `src/Game/path/__tests__/signatureRouting.test.ts` | 20-row rhythm block + vertical seams |
| Docs | Grid SSOT, rhythm design notes, T-008–T-012 |

**Locked tuning (post-QA, current code):**

- Signature rhythm per cycle: **2 drift + 2 chute + 1 SNAP** × **4 cycles** = **20 generator rows** at cycle 2, 4, 6… CLIMAX
- Drift pattern: `[0, +1]` (second drift uses `pattern[sm]`, not `pattern[sm-1]`)
- Transfer: **partial-width sliding chutes** (`SIGNATURE_BRIDGE_CHUTE_WIDTH: 5`) — side pillars stay solid; **not** full-width false-wall bridges
- SNAP: opposite-band 2-wide target (`climaxSignatureSnapHopLeft`); chutes preserve vertical seam into SNAP
- Runway: `SIGNATURE_TRANSFER_RUNWAY_DUP_MIN: 6` on chute + SNAP gap shifts (floor when global dup has ramped to 2–3)
- Boss fires **once per macro cycle** (`signatureConsumedCycleIndex` on template ctx)
- Attempt #1 gets signature beats; pattern pick uses `runBlueprint.runSeed` (not pacing `runSeed: 0`)
- v1 pool: `{ pinballHop }` only — `mirrorChicane` deferred (T-010)

**Founder QA notes (2026-06):** Chutes are **fair** and distinct from false-wall caverns; SNAP is **acceptable for v1**. Signature pool stays `{ pinballHop }` until a new boss mode is designed.

**Verify Phase 4:** `npm test -- --watchAll=false signatureCadence signatureRouting climaxGenerators cyclePersonality runBlueprint`

### Phase 5 — Milestones + attempt memory ✅ (2026-06-28)

**Done:**

| File | What it does |
|------|----------------|
| `src/config/runProgression.ts` | Milestone thresholds (300/700/1000), attempt-memory tuning |
| `src/Game/path/runProgressionPools.ts` | `resolveUnlockedPools`, dynamic weight builders |
| `src/Game/path/deathTelemetry.ts` | Death capture, history ring buffer, breather weight boost |
| `src/Game/path/runBlueprint.ts` | Pools + `deathHistory` wired into roll / assign |
| `src/Game/ecs-components/GameSession.ts` | `lifetimeRunCount`, `deathHistory` |
| `src/Game/session/beginGameplay.ts` | `recordRunDeathOnGameOver` (UI thread) |
| `src/Game/persistence/runProgressionStorage.ts` | Load/persist best score + lifetime run count |
| `src/Game/persistence/persistRunFinishedRunBridge.ts` | RN-thread bridge for `scheduleOnRN` |
| `src/containers/Scenes/StartScene/ReadySceneController-rntge.tsx` | Hydrate stats on cold start |
| `src/systems/PhysicsSystem/SwimmerPhysicsSystem.ts` | Game over → record death + persist |
| `src/Game/path/openingArchetype.ts` | `breather` chute cap override |
| `src/systems/PhysicsSystem/ObstacleSystem.ts` | `earlyFork` multipath opening rows |
| Tests | `runProgressionPools`, `deathTelemetry`, `earlyForkOpening`, extended `runBlueprint` |

**Locked tuning (founder, Phase 5):**

- Milestones: best score **300** → `earlyFork`, **700** → `breather`, **1000** → `tensionEarly`
- Attempt memory: all last **3** deaths below **200** → breather weight **×3** (when unlocked)
- Signature pool: **`{ pinballHop }` only**
- First run of session: still fixed `warmChute` regardless of best score

**Opening archetypes (formerly deferred):**

| Archetype | Player read | Status |
|-----------|-------------|--------|
| `breather` | Long calm straight before chicane | ✅ Milestone 700 + attempt-memory boost |
| `earlyFork` | Two lanes in first ~14 rows | ✅ Milestone 300; multipath opening |

**Verify Phase 5:**

```bash
npm test -- --watchAll=false runProgressionPools deathTelemetry runBlueprint openingArchetype flowOpeningRows earlyForkOpening cyclePersonality signatureCadence
```

---

## Phase 5 Handoff — Geometry Plateau & Agent Brief (historical)

**Date locked:** 2026-06-28  
**Phase 5 shipped:** 2026-06-28 — see [Phase 5 implementation status](#phase-5--milestones--attempt-memory--2026-06-28-1) above.  
**Founder decision:** Do **not** implement chapter UI, telegraph FX, JSON silhouette segments, or new signature/path generators before Phase 5 meta shipped. **Meta layer is now live.**

### Realization (authoritative)

The **core loop** — one-thumb steer, rising water, descending block rows, vertical seam survival — is at **geometry vocabulary complete** for an 8-column hyper-casual infinite run.

| Layer | Status |
|-------|--------|
| Macro phases (FLOW → TENSION → CLIMAX → RELEASE) | ✅ Shipped |
| Phase generators (chute, chicane, funnel, paradox, pinball, false wall, release strip, multipath) | ✅ Shipped |
| Run blueprint + milestone pools + attempt memory | ✅ Phase 5 |
| Signature cadence + pinballHop boss block | ✅ Phase 4 |
| **New path/rhythm generators on same grid** | ⚠️ **Diminishing returns** — do not prioritize |

**Why further geometry has low ROI**

- **8 cols + 2-wide gaps + seam invariants** compress what *reads* as a new challenge. More column-bitmask patterns feel like lane shifts, not new verbs.
- Normal CLIMAX pinball uses overlap repair (≈±1 col effective hop). Signature SNAP uses sliding chutes + opposite-band target + transfer runway floor — reads as pinball transfer, not a new game mode.
- `mirrorChicane` and extra signature pool entries were deferred because **vertical budget + phase hook** matter more than another gap mutator (T-010).
- `gapDifficultyRamp` scales runway dup down at speed (2–3 rows late run); signature transfer has its own floor — further dup tuning fixes **fairness**, not **variety**.

**What is NOT maxed (post–Phase 5)**

| Track | Fixes | Spec / TODO |
|-------|--------|-------------|
| ~~**Milestone pool unlocks**~~ | ~~Long-term reason to return~~ | ✅ Phase 5 |
| ~~**Attempt memory (v1)**~~ | ~~Retry breather boost~~ | ✅ Phase 5 |
| **Death telemetry tuning** | Generator-specific retry nudges | T-003 |
| **Milestone retention tuning** | Threshold A/B vs churn | T-004 |
| **Chapter framing** (phase labels, telegraph FX) | Player reads which “act” they’re in | T-005 — **recommended next** |
| **JSON silhouette postcards** | Delight / store screenshots | T-011 |
| **Biome / skin as visual chapter** | New world feel, same generators | Out of scope for weights |
| **New boss / special modes** | Distinct 8-col chapters | Future design pass (not pool filler) |
| **New core verb** (dash, dive, grab) | Sequel-scale | Out of scope |

### Mental model for future work

```
Geometry (Phases 1–4)  →  What can happen on the grid        [DONE for v1]
Meta (Phase 5)         →  Why this run / retry feels different [DONE for v1]
Framing (post–5)       →  Why the player *notices* chapters    [NEXT — T-005]
New verb (future)      →  Sequel / major update              [Out of scope]
```

### Phase 5 — implementation checklist (complete)

1. [x] **Persistence:** `bestScore` + `lifetimeRunCount` via AsyncStorage; milestones gate on **best score only**
2. [x] **`UnlockedPools` wiring:** `earlyFork`, `breather`, `tensionEarly` — signatures stay `{ pinballHop }`
3. [x] **`DeathContext` storage:** `recordRunDeathOnGameOver` appends ring buffer on game over
4. [x] **Attempt memory v1:** Breather weight boost on low-score streak — generator penalties deferred (T-003)
5. [ ] **T-007 (optional):** Persist `sessionSeed` across cold start

### Phase 5 — files to touch

| Concern | Location |
|---------|----------|
| Blueprint roll + death type | `src/Game/path/runBlueprint.ts` |
| Pool defaults + milestone constants | `src/config/runProgression.ts` |
| Session fields | `src/Game/ecs-components/GameSession.ts` |
| Game over → record death | `markGameSessionGameOver` / `SwimmerPhysicsSystem.ts` |
| Retry roll | `src/systems/RestartGameplaySystem.ts` |
| Tests | `src/Game/path/__tests__/runBlueprint.test.ts` |

### ~~Do-not-do until Phase 5 ships (T-013)~~ — **lifted 2026-06-28**

Phase 5 meta shipped. Still **do not** (without new design pass):

- New signature patterns or CLIMAX generators “for variety” on 8 cols
- Coupling biome or skin to blueprint weights

**Now OK to prioritize (post–Phase 5):**

- Phase transition UI / chapter text / boss telegraph (T-005)
- Milestone / attempt-memory tuning from play data (T-003, T-004)
- Optional `sessionSeed` persist (T-007)

### ~~Recommended next — Phase 4~~ (superseded — Phases 1–4 complete)

<!--
Legacy Phase 4 checklist:
1. Track completed macro cycles per run
2. Force signature pattern on cadence during CLIMAX
3. Config keys for firstSignatureAtCycle, signatureEveryNCycles
-->

<!--
Legacy Phase 3 checklist — kept for history:
1. Fold runSeed into pacingCycleLayoutFromCycleStart for cycle 1
2. climaxPreference selects pinball vs false wall when CLIMAX stage initializes
-->

### ~~Recommended next — Phase 2~~ (superseded by Phase 2 complete above)

<!--
Legacy Phase 2 checklist — kept for history:
1. Wire session.runSeed → pathRunId
2. Opening archetype routing in FLOW
3. leftBias + fastChicane + rightBias
4. defer breather / earlyFork
-->

---

## Out of Scope (do not implement under this spec)

- Biome-specific generator weights or world mechanics
- Character skin affecting gap width, speed, or blueprint
- New obstacle types or physics verbs
- Handcrafted JSON level mode for infinite
- Wall-clock boss timers
- ML / dynamic difficulty beyond weighted pools
- Monetization, daily quests, social leaderboards
- Changing macro phase **order** (FLOW → TENSION → CLIMAX → RELEASE stays)

---

## Signature Boss Rhythm — Design Notes

How to think about signature beats when tuning (Phase 4+).

### Vertical time the player gets

1. **Generator row** — gap shape changes on one band.
2. **Runway dup** — after a gap **set** change, `gapShiftRunwayDupRowsFromTotalRows` stacks **5–8 duplicate rows** (early run) with the **new** gaps so the player has vertical space to reposition at rising water speed.

### pinballHop rhythm (v1 boss — current)

One **cycle** = 2 drift + 2 chute + 1 SNAP:

| Step | Player read |
|------|-------------|
| Drift 1 | Hold 2-wide lane |
| Drift 2 | +1 col creep (telegraph) |
| Chute 1–2 | **5-col sliding corridor**, pillars on sides — reposition toward SNAP side |
| SNAP | Opposite-band 2-wide commit |

Signature block = **4 cycles** (**20 generator rows**) → then normal `climaxPreference` CLIMAX chain.

**Boss feel = tap-tap-slide-SNAP rhythm**, not false-wall empty cavern, not cross-shaft teleport without seam.

### Engine constraints (read before tuning)

| Concept | Reality in code |
|---------|-----------------|
| **8-col grid** | SSOT `Layout.ts` → `COLUMNS: 8`; hop distance capped by lane count |
| **Vertical seam** | Required between rows; chutes overlap drift + SNAP bands; no `skipSeamRepair` on SNAP (bridge/chute provides path) |
| **Runway at speed** | Global dup → 2–3 late run; signature chute/SNAP uses `SIGNATURE_TRANSFER_RUNWAY_DUP_MIN: 6` |
| **Normal CLIMAX pinball** | `climaxPinballRepairHopOverlap` — effective hop ≈ ±1 col |
| **Signature budget** | 20 rows ≈ substantial CLIMAX prefix; remainder = normal pinball / false wall |
| **Further signature tuning** | Phase 5 shipped — tune only with new boss design, not pool filler |

### Cadence defaults

- `firstSignatureAtCycle = 2`, `signatureEveryNCycles = 2` → beats on cycles **2, 4, 6…**
- **Attempt #1** gets signature beats (same cadence as retries)

---

## Open TODOs (future decisions)

| ID | Question | Status |
|----|----------|--------|
| T-001 | First-run policy: per install, per session, or onboarding arc? | **Locked: per session** (first Start after entity create) |
| T-002 | Signature cadence: every 2 cycles vs every 3; start cycle 1 vs 2 | Open — defaults in `runProgression.ts` (2 / 2) |
| T-003 | Death telemetry: which generators to tag; generator-specific attempt memory | **Partial — capture shipped; penalty weights open** |
| T-004 | Milestone thresholds vs retention data | **Partial — defaults 300/700/1000 in code; tune from play** |
| T-005 | Signature telegraph FX (water surge before beat) | **Recommended next — post Phase 5** |
| T-006 | Cross-session `runAttemptIndex` reset | **Locked: session-scoped**; `lifetimeRunCount` persisted separately ✅ |
| T-007 | Persist `sessionSeed` via AsyncStorage so first run pacing can vary after cold start | Open — TODO in `runProgression.ts` |
| T-008 | False-wall CLIMAX emits consecutive **fully block-free rows** (`climaxFalseWallFullWidthGapRow` + runway dup). Player sees empty water bands between cavern/squeeze segments. Fix: pillar bridge, single bridge max, or remove bridge. | Open — post Phase 4 |
| T-009 | Signature SNAP + sliding chutes (partial-width, not full false-wall bridge) + transfer runway floor. Normal pinball overlap repair unchanged. | **Partial — v1 acceptable; no more pre–Phase 5 tuning** |
| T-010 | `mirrorChicane` deferred — FLOW slalom in CLIMAX with short row budget is not a boss chapter. Redesign with 12–20+ row vertical budget or alternate phase hook. Removed from v1 pool. | Open — Phase 5+ |
| T-011 | JSON silhouette templates (`templates/obstacles/*.ts`) still 15-col art vs 8-col gameplay grid. Reauthor art or add scale at render time. | Open — art pipeline |
| T-012 | Path unit tests historically used `COLS=15`; migrated in Phase 4 to `Layout.ts`. | **Closed in Phase 4** |
| T-013 | **Geometry vocabulary plateau** — Phases 1–4 complete; Phase 5 meta shipped 2026-06-28 | **Closed** |

---

## Success Criteria

- [x] Retry opening: lane bias distinct on retry (founder QA); ≥80% formal pass not measured
- [x] First run of session: **identical blueprint** every time (`createFixedFirstRunBlueprint` — unit test)
- [x] Same `runSeed` + attempt index → identical opening rows (`flowOpeningRows.test.ts` determinism)
- [x] No coupling between equipped skin / biome and `RunBlueprint` (nothing reads skin/biome in roll path)
- [x] Core loop unchanged: one-thumb steer, same death rules, same macro phase order (Phase 1 — no generator changes)
- [x] Retry cycle-1 chapter timing shifts with `flowHeavy` (`cyclePersonality.test.ts`)
- [x] CLIMAX preference routes pinball / false-wall solo / mixed chain (`climaxPreferenceRouting.test.ts`)
- [x] First run cycle-1 pacing identical (`runSeed=0` on attempt #1 — `resolvePacingRunContext`)
- [x] Signature beat at cycle 2 CLIMAX (`signatureCadence.test.ts`)
- [x] pinballHop rhythm block: 20 rows (2 drift + 2 chute + SNAP × 4) then normal CLIMAX (`signatureRouting.test.ts`)
- [x] Grid docs + path tests use `Layout.ts` (8 cols — T-012)
- [x] Founder sign-off: geometry vocabulary complete for v1 (T-013)
- [x] Milestone pools unlock from best score (`runProgressionPools.test.ts`)
- [x] Death history + breather attempt-memory on retry (`deathTelemetry.test.ts`, `runBlueprint.test.ts`)
- [x] `breather` / `earlyFork` opening routing with seam tests (`flowOpeningRows`, `earlyForkOpening`)
- [ ] Founder manual QA: milestone unlocks + low-score breather skew in device play

---

## Post-Phase 5 — founder notes & next tracks

**Where the game sits:** The infinite-run stack is **feature-complete for v1 hyper-casual**: geometry (Phases 1–4) + meta variety (Phase 5). A player who dies and retries gets a different blueprint script; a player who improves their best score unlocks new opening and cycle-1 flavors. The first Start of each session stays a fixed onboarding beat.

**Highest-ROI next (not more gap mutators):**

1. **[player-experience-roadmap.md](./player-experience-roadmap.md)** — skill feedback (CLOSE!, TAP, combo), coins, unlockable world skins. Replaces T-005 “phase label” HUD framing.
2. **Playtest pass on Phase 5** — Confirm 300/700/1000 thresholds feel fair; watch whether breather + attempt memory reads as “the game helped me” vs “too easy.” Tune only `runProgression.ts` numbers.
3. **T-003 follow-up** — Log death `generator` tags in dev builds for 20–30 runs; then add *one* generator penalty if data supports it (e.g. pinball CLIMAX weight down after 3× pinball deaths).
4. **T-008** — False-wall empty-band rows (visual fairness polish, not variety).
5. **T-007 (optional)** — Persist `sessionSeed` so attempt #1 cycle-1 pacing can vary after app reopen without breaking first-run opening fixed policy.

**Explicitly defer until a design doc exists:**

- New signature / boss modes on 8 cols (founder: pinballHop is enough until a real new *mode* is designed)
- `mirrorChicane`, extra milestone signature patterns
- Biome/skin tied to blueprint weights

**Manual QA checklist (Phase 5):**

1. Fresh install → first Start = warm center chute
2. Die → game over (no crash); `lifetimeRunCount` increments after relaunch
3. Best 0 → retries = lane shifts only
4. Best ≥ 300 / 700 / 1000 → fork / breather / shorter cycle-1 can appear on retries
5. Die 3× under score 200 with breather unlocked → calmer retry skew

---

## Related Docs

- **[player-experience-roadmap.md](./player-experience-roadmap.md)** — **primary creative blueprint** (skill juice, worlds, coins, art phases) — supersedes T-005 “chapter labels” approach
- `src/docs/game-designer-llm-context.md` — full game context for LLM sessions
- `src/config/gapDifficultyRamp.ts` — in-run difficulty ramp tuning
- `src/Game/path/pacingDirector.ts` — macro cycle director

**Next agent:** Phases 1–5 complete. Start with [player-experience-roadmap.md](./player-experience-roadmap.md) Phase 1 (skill feedback), not engine phase labels on HUD.
