# Run-Level Progression — Design Spec

**Status:** Phases 1–4 complete + founder sign-off on geometry vocabulary (2026-06-28). **Next agent: Phase 5 only** — see [Phase 5 handoff](#phase-5-handoff--geometry-plateau--next-agent-brief).  
**Scope:** How each **run** (tap Start → play → die → retry) feels different from the last.  
**Out of scope:** New core mechanics, biome rule-twists, character gameplay modifiers, monetization, handcrafted level mode.

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
| Adaptive death analytics | Weight blueprint by death context | **Future — TBD** |

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

### 4. Death-context weighting is deferred

- Pinball currently reads as one of the **easier** climax patterns; 1–2 column gaps may be harder in practice.
- **TODO (future):** Instrument death context (`phase`, `generator`, `column`, `score`) and validate before biasing Attempt Memory away from specific generators.

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

**Grid SSOT:** Production infinite run uses **`LAYOUT_CONSTANTS.COLUMNS`** from [`src/Layout.ts`](../../src/Layout.ts) (currently **8**). Do not hardcode column counts in docs or generators. JSON silhouette art templates may use a different art grid — see T-011.

**Hooks:** signature cadence routing (Phase 4). Opening routing, blueprint roll, cycle personality, and CLIMAX preference routing are **done** (Phases 2–3).

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
- Pool starts with `{ pinballHop, mirrorChicane }`; others unlock via milestones

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

- If same `generator` appears in 2+ of last 3 deaths → **reduce weight** on that generator for **opening cycle only** (not global difficulty).
- If `score < threshold` (e.g. 200) on all last 3 → **+weight** on `breather` opening archetype.

**Status:** Spec approved; **instrumentation and weights TBD** after death telemetry exists.

---

## Milestone Pool Unlocks (run variety only)

Unlocks expand what can appear in **Run Blueprint rolls**. They do **not** change character stats, biome rules, or core mechanics.

| Milestone (score or lifetime runs) | Unlocks |
|-----------------------------------|---------|
| Default | `warmChute`, `fastChicane`, `leftBias`, `rightBias` |
| 100 | `earlyFork` |
| 500 | `breather` |
| 1000 | Signature pattern `falseWallFakeout` |
| 2000 | Signature pattern `paradoxNoRunway` |
| 5000 | Cycle personality `tensionEarly` added to pool |
| 10000 | Rare roll: `climaxForward` + shortened cycle 1 RELEASE |

Exact thresholds are tuning constants — not product commitments.

**Explicitly not milestone-gated here:** biome art, swimmer skins, new obstacle types, water rules.

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
  sessionSeed: u32                 // set once at entity create (overlayIntroStartMs >>> 0)
  runAttemptIndex: number          // 0 = never started; 1 = first run (fixed blueprint)
  runSeed: u32
  runBlueprint: RunBlueprint
  deathHistory: DeathContext[3]     // Phase 5 — not stored yet

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
- [ ] `breather` / `earlyFork` — **deferred** (see handoff below)

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

### Phase 5 — Milestones + attempt memory

- [ ] Load unlocked pools from persistence (score / run count)
- [ ] Death history + weight nudges (after telemetry)

---

## Implementation Status

### Phase 1 — Run Blueprint + storage ✅ (2026-06-27)

**Done:**

| File | What it does |
|------|----------------|
| `src/config/runProgression.ts` | Default pools, weights, signature cadence constants |
| `src/Game/path/runBlueprint.ts` | Types, `createFixedFirstRunBlueprint`, `rollRunBlueprint`, `assignBlueprintForNewRun` |
| `src/Game/path/__tests__/runBlueprint.test.ts` | 12 tests — determinism, pools, lifecycle |
| `src/Game/ecs-components/GameSession.ts` | `sessionSeed`, `runAttemptIndex`, `runSeed`, `runBlueprint` |
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

**Not wired yet (intentional):**

- `deathHistory` on game over
- Milestone pools from AsyncStorage
- Opening archetypes `breather` / `earlyFork` (deferred — see Phase 2 handoff)
- AsyncStorage session seed for first-run pacing variety (T-007)
- `mirrorChicane` signature routing (T-010)

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

**Founder QA notes (2026-06):** Chutes are **fair** and distinct from false-wall caverns; SNAP is not “sudden hop” fantasy but **acceptable for v1**. No further signature/path tuning before Phase 5.

**Verify Phase 4:** `npm test -- --watchAll=false signatureCadence signatureRouting climaxGenerators cyclePersonality runBlueprint`

### Deferred opening archetypes (Phase 2 handoff)

| Archetype | Player read | Why deferred | When to pick up |
|-----------|-------------|--------------|-----------------|
| `breather` | Long calm straight before any spike | Needs “too easy?” tuning; overlaps Phase 5 attempt-memory `breather` weight | Milestone 500 unlock + attempt memory |
| `earlyFork` | Two lanes visible in first ~15s | Highest seam risk (chute→multipath handoff); milestone-gated | After Phase 3–4 stable; route early rows through multipath/paradox |

### Recommended next — Phase 5 (milestones + attempt memory)

**→ Full brief:** [Phase 5 handoff — Geometry plateau & next agent](#phase-5-handoff--geometry-plateau--next-agent-brief) (authoritative for next agent).

1. Load unlocked pools from persistence (score / run count).
2. Death history + weight nudges (after telemetry).

---

## Phase 5 Handoff — Geometry Plateau & Next Agent Brief

**Date locked:** 2026-06-28  
**Founder decision:** Do **not** implement chapter UI, telegraph FX, JSON silhouette segments, or new signature/path generators before Phase 5. Document this plateau; start Phase 5 with a fresh agent.

### Realization (authoritative)

The **core loop** — one-thumb steer, rising water, descending block rows, vertical seam survival — is at **geometry vocabulary complete** for an 8-column hyper-casual infinite run.

| Layer | Status |
|-------|--------|
| Macro phases (FLOW → TENSION → CLIMAX → RELEASE) | ✅ Shipped |
| Phase generators (chute, chicane, funnel, paradox, pinball, false wall, release strip, multipath) | ✅ Shipped |
| Run blueprint (opening, cycle personality, climax preference) | ✅ Phases 2–3 |
| Signature cadence + pinballHop boss block | ✅ Phase 4 |
| **New path/rhythm generators on same grid** | ⚠️ **Diminishing returns** — do not prioritize |

**Why further geometry has low ROI**

- **8 cols + 2-wide gaps + seam invariants** compress what *reads* as a new challenge. More column-bitmask patterns feel like lane shifts, not new verbs.
- Normal CLIMAX pinball uses overlap repair (≈±1 col effective hop). Signature SNAP uses sliding chutes + opposite-band target + transfer runway floor — reads as pinball transfer, not a new game mode.
- `mirrorChicane` and extra signature pool entries were deferred because **vertical budget + phase hook** matter more than another gap mutator (T-010).
- `gapDifficultyRamp` scales runway dup down at speed (2–3 rows late run); signature transfer has its own floor — further dup tuning fixes **fairness**, not **variety**.

**What is NOT maxed (Phase 5+ and later — not pre–Phase 5)**

| Track | Fixes | Spec / TODO |
|-------|--------|-------------|
| **Milestone pool unlocks** | Long-term reason to return; expands blueprint pool | Phase 5 |
| **Attempt memory** | Retry feels different after specific deaths | Phase 5, `deathHistory` in `runBlueprint.ts` |
| **Death telemetry** | Know which generators actually kill | T-003 |
| **Deferred openings** (`breather`, `earlyFork`) | Milestone-gated | Phase 2 handoff table |
| **Chapter framing** (phase labels, telegraph FX) | Player reads which “act” they’re in | T-005 — **after Phase 5** |
| **JSON silhouette postcards** | Delight / store screenshots | T-011 |
| **Biome / skin as visual chapter** | New world feel, same generators | Out of scope for weights |
| **New core verb** (dash, dive, grab) | Sequel-scale | Out of scope |

### Mental model for future work

```
Geometry (Phases 1–4)  →  What can happen on the grid        [DONE for v1]
Meta (Phase 5)         →  Why this run / retry feels different [NEXT]
Framing (post–5)       →  Why the player *notices* chapters    [Deferred]
New verb (future)      →  Sequel / major update              [Out of scope]
```

### Phase 5 — implementation checklist

1. **Persistence:** Load unlocked pools from AsyncStorage (or project storage pattern) keyed by lifetime score / run count / best score — thresholds TBD (T-004).
2. **`UnlockedPools` wiring:** Pass `unlockedPools` into `rollRunBlueprint()` so milestones add `breather`, `earlyFork`, `tensionEarly`, `shortRelease`, extra signatures — see `DEFAULT_UNLOCKED_POOLS` in `runBlueprint.ts`.
3. **`DeathContext` storage:** On game over, append `{ phase, generator, score }` (cap N). Type exists in `runBlueprint.ts`; not stored yet.
4. **Attempt memory weights:** On retry, nudge blueprint away from recent death context — **after T-003 validates** which tags matter.
5. **T-007 (optional):** Persist `sessionSeed` across cold start.

### Phase 5 — files to touch

| Concern | Location |
|---------|----------|
| Blueprint roll + death type | `src/Game/path/runBlueprint.ts` |
| Pool defaults + milestone constants | `src/config/runProgression.ts` |
| Session fields | `src/Game/ecs-components/GameSession.ts` |
| Game over → record death | `markGameSessionGameOver` / `SwimmerPhysicsSystem.ts` |
| Retry roll | `src/systems/RestartGameplaySystem.ts` |
| Tests | `src/Game/path/__tests__/runBlueprint.test.ts` |

### Do-not-do until Phase 5 ships (T-013)

- New signature patterns or CLIMAX generators “for variety”
- Phase transition UI / chapter text / boss telegraph (T-005)
- Sprinkling JSON templates into infinite `directed` run
- Widen grid or reauthor 15-col art (T-011) as a progression task
- Coupling biome or skin to blueprint weights

### Verify before Phase 5 coding

```bash
npm test -- --watchAll=false runBlueprint signatureCadence signatureRouting cyclePersonality openingArchetype
```

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
| **Further signature tuning** | **Frozen** until Phase 5 ships — see handoff section |

### Cadence defaults

- `firstSignatureAtCycle = 2`, `signatureEveryNCycles = 2` → beats on cycles **2, 4, 6…**
- **Attempt #1** gets signature beats (same cadence as retries)

---

## Open TODOs (future decisions)

| ID | Question | Status |
|----|----------|--------|
| T-001 | First-run policy: per install, per session, or onboarding arc? | **Locked: per session** (first Start after entity create) |
| T-002 | Signature cadence: every 2 cycles vs every 3; start cycle 1 vs 2 | Open — defaults in `runProgression.ts` (2 / 2) |
| T-003 | Death telemetry: which generators to tag; confirm pinball vs narrow-gap difficulty | Open — Phase 5 |
| T-004 | Milestone thresholds vs retention data | Open — Phase 5 |
| T-005 | Signature telegraph FX (water surge before beat) | **Deferred — after Phase 5** (founder) |
| T-006 | Cross-session `runAttemptIndex` reset | **Locked: session-scoped**; lifetime counters separate in Phase 5 |
| T-007 | Persist `sessionSeed` via AsyncStorage so first run pacing can vary after cold start | Open — TODO in `runProgression.ts` |
| T-008 | False-wall CLIMAX emits consecutive **fully block-free rows** (`climaxFalseWallFullWidthGapRow` + runway dup). Player sees empty water bands between cavern/squeeze segments. Fix: pillar bridge, single bridge max, or remove bridge. | Open — post Phase 4 |
| T-009 | Signature SNAP + sliding chutes (partial-width, not full false-wall bridge) + transfer runway floor. Normal pinball overlap repair unchanged. | **Partial — v1 acceptable; no more pre–Phase 5 tuning** |
| T-010 | `mirrorChicane` deferred — FLOW slalom in CLIMAX with short row budget is not a boss chapter. Redesign with 12–20+ row vertical budget or alternate phase hook. Removed from v1 pool. | Open — Phase 5+ |
| T-011 | JSON silhouette templates (`templates/obstacles/*.ts`) still 15-col art vs 8-col gameplay grid. Reauthor art or add scale at render time. | Open — art pipeline |
| T-012 | Path unit tests historically used `COLS=15`; migrated in Phase 4 to `Layout.ts`. | **Closed in Phase 4** |
| T-013 | **Geometry vocabulary plateau** — Phases 1–4 complete; do not add path generators before Phase 5. Framing/telegraph/segments deferred. | **Locked — see Phase 5 handoff** |

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
- [x] Founder sign-off: geometry vocabulary complete for v1; Phase 5 next (T-013)

---

## Related Docs

- `src/docs/game-designer-llm-context.md` — full game context for LLM sessions
- `src/config/gapDifficultyRamp.ts` — in-run difficulty ramp tuning
- `src/Game/path/pacingDirector.ts` — macro cycle director

**Next agent:** Start with [Phase 5 handoff](#phase-5-handoff--geometry-plateau--next-agent-brief) in this file. Do not expand path generators before Phase 5 (T-013).
