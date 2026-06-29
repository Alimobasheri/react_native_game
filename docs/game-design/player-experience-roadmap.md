# Player Experience Roadmap — Blueprint & Master Plan

**Status:** Draft v1 (2026-06-28) — **primary creative blueprint** for post–geometry work  
**Audience:** Founder, artists, implementers, future agent sessions  
**Purpose:** Turn the shipped infinite-run **engine** into a game players **feel, collect, and return to** — without new core verbs or endless single-world sessions.

**Companion docs (do not duplicate — link and extend):**

| Doc | Owns |
|-----|------|
| [run-level-progression.md](./run-level-progression.md) | Run blueprint, opening archetypes, milestone **geometry** pools, attempt memory — **backend scheduler** |
| [../visual-design/swimmer-ai-context.md](../visual-design/swimmer-ai-context.md) | Art AI prompts, layer rules, export sizes |
| [../containers/ReactNativeSkiaGameEngine/swimmer.styles.md](../../src/containers/ReactNativeSkiaGameEngine/swimmer.styles.md) | **Chunky Underground Aqua Rush** style bible |
| [../visual-design/swimmer-skins.md](../visual-design/swimmer-skins.md) | Character skin collection |
| [../../src/docs/game-designer-llm-context.md](../../src/docs/game-designer-llm-context.md) | Core loop, grid, death rules |

---

## 0. How to use this document

1. **Pick a phase** from [§8 Roadmap](#8-implementation-roadmap-phases) — only one “hero” phase in flight at a time unless tasks are explicitly parallel (art vs code).
2. **Check locked decisions** in [§2](#2-locked-design-decisions) before brainstorming — don’t re-litigate.
3. **Park new ideas** in [§12 Brainstorm parking lot](#12-brainstorm-parking-lot) — never block a phase on unprioritized creativity.
4. **Ship player-visible slices** — each phase ends with something you can feel on device in under 5 minutes.
5. **Update phase checkboxes** and add a short handoff log under `docs/visual-design/logs/` when a phase ships (see [ai-handoff-protocol.md](../visual-design/ai-handoff-protocol.md)).

---

## 1. North star — what the player should believe

### One-sentence fantasy

> A goofy block creature is **launched upward** by a crazy underground flood; you steer in gaps, grab coins, get praised for clutch moves, die fast, unlock **new cave worlds** that look completely different — **same thumb, no escape, no end.**

### What we are NOT making

| Not this | Why |
|----------|-----|
| Descent / “going deeper = darker” | Wrong metaphor — we **rise** |
| Escape to sky as win condition | Breaks endless loop; sky is a **room type** or **VFX**, not credits |
| Exposing engine phase names (FLOW, TENSION, CLIMAX) | Developer abstraction — players need **pictures**, not labels |
| One world type for 20+ minute arcs | Sessions stay **short** (target 3–8 min); variety = **meta worlds** + **in-run juice** |
| Gameplay-changing unlocks in v1 of this roadmap | Worlds and items are **presentation + soft helpers** until a deliberate sequel pass |

### Session shape (target)

```
Title → equip world → Start → 3–8 min run → die → coins + praise summary → Retry or Shop → ...
```

**Retention loop:** skill praise during run → coins after → progress bar on next world → “one more run.”

---

## 2. Locked design decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| **L-001** | **Two environment layers** — see [§3](#3-two-layer-environment-architecture) | Meta collection + in-run reactivity without mid-run world swapping |
| **L-002** | **Equipped world skin is fixed for entire run** | Short sessions; readable identity; Dune-style unlock clarity |
| **L-003** | **World skins never change generator weights** | Same rule as run-level-progression — cosmetic only |
| **L-004** | **Run blueprint / opening archetypes stay independent of equipped world** | Geometry variety ≠ art pack |
| **L-005** | **Light grows within a run / within a world palette** — not one global ramp to sky | Rising flood = more air and warmth **locally**, not “finale” |
| **L-006** | **Skill feedback is highest ROI** | CLOSE!, TAP coaching, combo badge before shop complexity |
| **L-007** | **Coins are the primary meta currency** for world unlocks in v1 | Simple hyper-casual economy |
| **L-008** | **Copy: max 1–2 words on gameplay flashes** | Hyper-casual read time &lt; 0.5s |
| **L-009** | **Orange / warm blocks = danger** in default world; other worlds may recolor but must stay **instantly readable** | Style bible hierarchy |
| **L-010** | **Geometry vocabulary plateau** — no new gap mutators for “variety” | See run-level-progression T-013 |

---

## 3. Two-layer environment architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER B — META (between runs)                                  │
│  World skins: walls, blocks, water tint, particles, title art   │
│  Unlock: coins + soft gates (best score, lifetime runs)         │
│  Choose on title → fixed for whole run                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ equipped world provides art tokens
┌─────────────────────────────────────────────────────────────────┐
│  LAYER A — IN-RUN REACTIVE (during run)                         │
│  Same triggers everywhere; VFX/text/coins use world's tokens    │
│  Triggers: skill, rest corridors, challenge spikes, local light   │
│  Does NOT swap world mid-run                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ sits on top of
┌─────────────────────────────────────────────────────────────────┐
│  ENGINE (shipped) — gaps, pacing, blueprint, signature boss     │
│  Invisible to player; never labeled on screen                   │
└─────────────────────────────────────────────────────────────────┘
```

### Layer A — In-run reactive (skill + time + challenge)

**Job:** Make the **equipped world** feel alive for 3–8 minutes without changing rooms.

| Trigger class | Player-visible result | Gameplay change |
|---------------|----------------------|-----------------|
| Near-pin clearance | CLOSE! + spark + small +score flyout | No |
| Cramped ceiling escape | TAP TAP TAP flashes → SAVED! | No |
| Clean streak | ×2 / ×3 badge on HUD | No |
| Wide rest corridor (RELEASE geometry) | Light pocket, coins, GREAT! | No |
| Score band within run | Vignette eases slightly; water highlights bump | No |
| Signature pinball block | Glowing paddles, zip arc, +score (Phase 5+) | No |

**Local light arc (within one run, one world):**  
Start slightly enclosed → rest corridor **opens** light → next squeeze feels contrasty → repeat. **Not** a monotonic path to sky.

### Layer B — Meta world skins (collection)

**Job:** Reason to return **between sessions** — new places that re-skin the same ride.

Each world is an **art pack**:

- Parallax cave layers (2–3)
- Block material set (3–5 variants, same grid silhouette)
- Water tint + foam palette
- Ambient particles
- Reactive VFX palette (Layer A reads these tokens)
- Title card + shop icon + optional music stub

**Unlock model (v1):** coins primary; optional `bestScore >= N` as soft gate.  
**Explicitly not:** new gap rules, speed curves, or blueprint weights per world.

---

## 4. Stats, skill, luck — player transparency

Reference: [Mobile F2P — Stats, Skill and Luck](https://mobilefreetoplay.com/mobile-game-design-stats-skill-luck/).

| Dimension | Our game | Player feedback |
|-----------|----------|-----------------|
| **Skill** | Steer, read gaps, panic-tap escape | CLOSE!, TAP, combo, death context line |
| **Stats** | Unlocked worlds, optional swimmer skins | Shop card, progress bar, equip checkmark |
| **Luck** | Blueprint opening roll, procedural mutation | Optional run stamp (“Fork ahead”) — never blame luck for death |

**Post-death line (target):** one readable line — e.g. `Pinned under rock · narrow gap` — **not** `CLIMAX · pinball`.

---

## 5. Run segmentation — player time, not engine phases

Map **felt time** at current raising speed; generation stays row-based.  
**Never** show segment names on HUD during play — use for design, tuning, and placement of juice.

| Segment | Approx. time | Player job | Layer A juice | Layer B role |
|---------|--------------|------------|---------------|--------------|
| **Hook** | 0–5s | Control works; one good steer | Subtle score pop | World’s default look |
| **Teach** | 5–15s | “This run reads different” (geometry) | First CLOSE! opportunity | World identity obvious |
| **Flow** | 15–45s | Confidence; combo builds | ×2 badge; coin crumbs optional | — |
| **Spike** | 45–75s | First real death pressure | TAP coaching if ceiling pin | — |
| **Breath** | after spike | Relief | Rest corridor: coins, GREAT!, light pocket | World-specific rest VFX |
| **Set-piece** | cadence-based | Memorable skill moment | Pinball paddles / future wonders | World-themed paddle art |
| **Deep** | 75s+ | Chasing best; intensity | Stronger praise; higher coin density in rests | — |

**Session end:** usually in Spike or Deep — **by design**. Meta progress happens on game over, not at minute 20 in one tunnel.

---

## 6. Content systems

### 6.1 World skins — launch catalog (4 + default)

Expand later via [§12](#12-brainstorm-parking-lot). v1 ship **5 total**.

| ID | Display name | Unlock (v1 target) | Visual identity | Danger block read |
|----|--------------|-------------------|-----------------|-------------------|
| `mud_flood` | Mud Flood | **Default** | Purple cave, orange clay, bright aqua water | Orange clay |
| `crystal_geode` | Crystal Geode | 2,500 coins | Cyan crystals, sparkly water, cool purple walls | Pale quartz-orange |
| `moss_breach` | Moss Breach | 4,000 coins + best 350 | Green moss, leak beams, warm particles | Mossy stone orange-brown |
| `ember_tube` | Ember Tube | 6,000 coins + best 600 | Basalt, red ambient **glow** (bright hot, not dark) | Charred orange-red |
| `sky_pocket` | Sky Pocket | 8,500 coins + best 900 | Gold sky wash at top, limestone, mist | Sun-bleached clay |

**Sky Pocket rule:** brightest world — still **no escape narrative**. Flavor text: *“A rare bright chamber in the stack.”*

#### World skin spec template (copy per world)

```markdown
## [Display name] (`id`)

**Unlock:** …
**One-line player pitch:** …

### Materials
- Walls: …
- Blocks (danger): …
- Water: base / highlight / foam
- Particles: …

### Reactive pack (Layer A)
- CLOSE! spark: …
- Rest corridor light: …
- Combo edge glow: …
- Pinball paddle look: …

### Art deliverables
- [ ] parallax_far.webp
- [ ] parallax_mid.webp
- [ ] block_sheet.webp (3–5 variants)
- [ ] shop_card.webp
- [ ] icon_256.webp

### Readable in 0.3s test
- [ ] Danger blocks distinct from water and walls
- [ ] Swimmer green (or skin) still pops
```

### 6.2 Swimmer skins (parallel track)

Owned by [swimmer-skins.md](../visual-design/swimmer-skins.md).  
**Rule:** character skin ⊥ world skin — any combination on title. Neither affects blueprint.

**Roadmap tie-in:** ship **Aqua Sprout** default art before world #2; shop UI can show character + world tabs later.

### 6.3 Items & pickups

**Phase 4+** — don’t block Phases 1–3.

| Item | Look | Effect (v1) | Spawn bias |
|------|------|-------------|------------|
| **Coin** | Gold disk in gap | +1 meta currency | Rest corridors, skill flyouts |
| **Coin line** | String in wide channel | Burst collection | RELEASE rows |
| **Bubble shield** | Blue orb | 1 hit or 2s ignore one block row | Rest corridors |
| **Jet ribbon** | Up-arrow trail | ×2 score 3s | After ×3 combo |
| **Magnet** | Gold swirl | Pull coins in corridor | Rare in rest |

**Fairness:** power-ups **bias toward relief**, not random mid-death.

### 6.4 Set-pieces (visual mini-games)

Same geometry as signature `pinballHop` — **reskin as skill toy:**

| Beat | Player read | Visual |
|------|-------------|--------|
| Approach | “Paddles ahead” | Tall glowing vertical slabs on walls |
| Timed tap | BOING zip | Arc trail, +100 flyout |
| Miss | Still survivable | Dull thud, no bonus |

Per-world paddle materials in reactive pack (crystal slab, ember rod, etc.).

### 6.5 Cave discoveries (ambient, on-path)

Not hidden collectibles — props in wall parallax as player rises:

- Fossil silhouette
- Glowing jellyfish in crack
- Old ladder carving

**Optional** +10 coin sparkle on first pass per run. Low priority — Phase 6 polish.

---

## 7. Copy deck — approved voice

**Tone:** arcade, warm, stupid-fun — not lore, not horror.  
**Rule:** gameplay flashes ≤ 2 words; game over can use one short line.

### Gameplay flashes (Layer A)

| Key | Copy | When | Status |
|-----|------|------|--------|
| `near_miss` | CLOSE! | Tight gap thread / scrape | **Interim** — clearance band; redesign §15 Wave 1 |
| `near_miss_alt` | NICE! | Good steer, softer near-pin | **Interim** — clearance band; redesign §15 Wave 1 |
| `tap_coach` | TAP | Each flash under ceiling pin | **Not shipped** — §15 Wave 1 |
| `tap_saved` | SAVED! | Escaped pin | **Not shipped** — §15 Wave 1 |
| `rest_enter` | GREAT! | Rest corridor mid | **Not shipped** — §15 Wave 3 (Phase 2) |
| `rest_perfect` | PERFECT! | All corridor coins | **Not shipped** — §15 Wave 3 (Phase 2) |
| `combo_2` | ×2 | HUD badge — tap streak | **Shipped** (tap-tier); clean-gap §15 Wave 2 |
| `combo_3` | ×3 | HUD badge — tap streak | **Shipped** (tap-tier); clean-gap §15 Wave 2 |
| `paddle_hit` | +100 | Pinball zip | **Not shipped** — §15 Wave 4 (Phase 6) |
| `new_best` | NEW BEST! | Beat personal best | **Shipped** (`ScoreHudSystem`) |
| _(bonus flyout)_ | +N | Near-miss bonus | **Shipped** (`GameplayFeedbackSystem`) |

Trigger definitions for all Layer A copy: **[§15](#15-layer-a-skill-feedback--full-implementation-handoff)**.

### Game over / meta

| Key | Copy |
|-----|------|
| `coins_earned` | +{n} coins |
| `world_progress` | {name} — {pct}% |
| `world_unlocked` | New world unlocked! |
| `death_pinned` | Pinned under rock |
| `death_slow` | Couldn’t clear in time |

### Shop / title

| Key | Copy |
|-----|------|
| `equip` | Equip |
| `locked` | {n} coins |
| `need_score` | Reach {score} |

**Open slot:** add rows to this table — don’t invent flash copy in code without logging here.

---

## 8. Implementation roadmap — phases

**Dependency graph:**

```
P0 Audit ──► P1 Skill juice ──► P2 Rest + coins ──► P3 World meta
                                                      │
                      P4 Per-world reactive ◄───────────┘
                              │
                      P5 Items (optional)
                              │
                      P6 Set-piece skin + polish
                              │
                      P7 Live tuning + content drops
```

### Phase 0 — Audit & scaffolding ✅ prerequisite

**Goal:** Hooks exist; no player-visible change required.

| Task | Status | Notes |
|------|--------|-------|
| Run blueprint + milestones shipped | ✅ | [run-level-progression.md](./run-level-progression.md) |
| RELEASE rest geometry exists | ✅ | `releaseGenerators.ts` |
| Near-pin detection for FX | ✅ | `SwimmerWaterContactFxSystem` clearance |
| Narrow escape tap boost | ✅ | `swimmerHyperCasualPhysics.ts` |
| Score HUD pop / new best | ✅ | `ScoreHudSystem.ts` |
| Style bible | ✅ | `swimmer.styles.md` |
| World skin type + equip persistence | ⬜ | New — Phase 3 |
| Coin currency + persist | ⬜ | New — Phase 2 |
| Floating feedback overlay system | ✅ | `GameplayFeedbackSystem.ts` + `GameplayFeedbackView-rntge.tsx` |

**Exit:** checklist above marked; pick Phase 1.

---

### Phase 1 — Skill feedback MVP (Layer A core)

**Player promise:** *The game talks when I play well or barely survive.*

**Ship on device:**

- [x] `CLOSE!` / `NICE!` on near-pin — **interim clearance-band MVP; full redesign in [§15](#15-layer-a-skill-feedback--full-implementation-handoff) Wave 1**
- [x] Floating `+N` flyout into score (small amounts — 10–25)
- [ ] `TAP` triple-flash when under block lip in narrow slot + `SAVED!` on escape — **not shipped; [§15](#15-layer-a-skill-feedback--full-implementation-handoff) Wave 1**
- [x] `×2` / `×3` combo badge (**tap-tier** `visualStrokeTier` MVP — clean-gap combo [§15](#15-layer-a-skill-feedback--full-implementation-handoff) Wave 2)
- [x] Death line on game over panel (generator → player copy from §7; suffix toggle in `deathCopy.ts`)

**Art / style:**

- [x] Flash text style: **Fredoka Bold**, white + yellow stroke, 0.4s float-up fade
- [x] Spark: Skia circle ring (config `SHOW_SPARK_RING`)

**Follow-up session (not blocking P2):**

- [ ] **Clean gap combo** — [§15](#15-layer-a-skill-feedback--full-implementation-handoff) Wave 2
- [ ] **TAP / SAVED!** coaching — [§15](#15-layer-a-skill-feedback--full-implementation-handoff) Wave 1
- [ ] **Near-miss redesign** — skill-moment detectors replace clearance band — [§15](#15-layer-a-skill-feedback--full-implementation-handoff) Wave 1

**Engine touchpoints (implementer hints):**

- Clearance: `SwimmerWaterContactFxSystem` / swimmer clearance helpers
- Tap coach: pin detection in `SwimmerPhysicsSystem`
- Overlay: new `GameplayFeedbackSystem` or extend HUD — **worklet-safe**

**Tests / QA:**

- [x] Near-miss doesn’t fire in open water (unit: `nearMissDetection.test.ts`)
- [x] TAP doesn’t fire on first run tutorial overlay (gate: `gameplayFeedbackGates.test.ts`)
- [ ] Combo resets on sloppy steer (manual — tap tier resets in `swimmerTapInput.ts`; verify on device)

**Exit:** founder plays 10 runs and can **feel** praise — not just score ticking.

**Estimate:** 1 focused implementation sprint.

---

### Phase 2 — Rest corridors + coin economy

**Player promise:** *Hard squeeze → bright payoff hallway → coins toward next world.*

**Ship on device:**

- [ ] Coins spawn in RELEASE / wide rows (on path, not maze)
- [ ] Rest corridor: light pocket VFX (equipped world’s default pack = Mud Flood)
- [ ] `GREAT!` on corridor entry; `PERFECT!` if all coins collected
- [ ] Game over: `+{n} coins` with tally animation
- [ ] Persist coins AsyncStorage (mirror `runProgressionStorage` pattern)

**Economy tuning (starting point — tune in Phase 7):**

| Parameter | v1 value |
|-----------|----------|
| Coins per pickup | 1 |
| Typical rest corridor | 8–14 coins |
| Average run earnings | 40–70 early; 80–150 good |
| First world unlock | 2,500 |

**Art:**

- [ ] `coin_pickup.webp` — gold, readable at gap width
- [ ] Collect sparkle (3 frame)

**Exit:** after run, coin total increases; player understands **coins → something later**.

**Estimate:** 1 sprint (parallel coin art).

---

### Phase 3 — World skins meta (Layer B)

**Player promise:** *I unlock and equip new caves; runs look completely different.*

**Ship on device:**

- [ ] `WorldSkin` config: materials, tints, parallax refs, reactive token IDs
- [ ] Equip on title; persist choice
- [ ] Render: parallax + block sheet + water tint from equipped world
- [ ] Shop row: 5 worlds with lock state, coin price, best-score gate
- [ ] Unlock fanfare on first purchase (short — 1s card flip, no modal wall)
- [ ] **Verify:** blueprint roll unchanged when swapping worlds

**Art pipeline (this phase is art-heavy):**

| Asset | Mud Flood | Crystal | Moss | Ember | Sky Pocket |
|-------|-----------|---------|------|-------|------------|
| Parallax | existing / polish | ⬜ | ⬜ | ⬜ | ⬜ |
| Blocks | existing | ⬜ | ⬜ | ⬜ | ⬜ |
| Shop card | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

Use [swimmer-ai-context.md](../visual-design/swimmer-ai-context.md) + style bible §4 palettes.

**Exit:** equip Crystal Geode → full run in crystal look; Mud still default for new install.

**Estimate:** 2–3 sprints (1 code, 2 art if AI-assisted parallel).

---

### Phase 4 — Per-world reactive packs

**Player promise:** *CLOSE! and rest lights match the world I chose.*

**Ship:**

- [ ] Reactive token table per `WorldSkinId`
- [ ] Mud / Crystal / Moss / Ember / Sky each: CLOSE spark, rest beam, combo glow, paddle skin
- [ ] No new triggers — only art routing

**Exit:** side-by-side two runs, same events, visibly different juice.

**Estimate:** 1 sprint after Phase 3 art exists.

---

### Phase 5 — Items (power-ups) — optional gate

**Gate:** Phase 1–3 feel good in playtest; don’t add complexity if skill juice isn’t landing.

**Ship (minimum):**

- [ ] Bubble shield + Jet ribbon only
- [ ] Spawn rules in rest + post-combo
- [ ] Clear icon language (§6.3)

**Exit:** one shield save felt **fair**, not random.

---

### Phase 6 — Set-piece polish + ambient discoveries

**Ship:**

- [ ] Pinball paddles visual + zip (signature boss)
- [ ] Per-world paddle art
- [ ] 1–2 ambient wall discoveries per world (parallax prop)
- [ ] Audio pass stub list (SFX hooks — even placeholders)

**Exit:** signature beat reads as **mini-game**, not lane shift.

---

### Phase 7 — Live tuning & content drops

**Ongoing:**

- [ ] Coin prices vs session length (retention data)
- [ ] World #6+ from parking lot
- [ ] Seasonal shop featured world
- [ ] Swimmer skin shop tab
- [ ] A/B: death line on/off, TAP coach on/off
- [ ] Playtest script (§10)

---

## 9. Art generation & style workflow

### 9.1 Non-negotiables (from style bible)

- **Readable in &lt; 1s:** water = rise, green swimmer = player, blocks = danger, gaps = life
- **Bright aqua water** — never murky descent
- **Chunky, toy-like, saturated** — not horror sewer
- **8-column grid** — block sprites tile cleanly; see `Layout.ts`

### 9.2 AI art pipeline (per asset)

1. Copy prompt block from `swimmer-ai-context.md`
2. Generate → review **silhouette at 64px width** (gameplay read)
3. Align in [swimmer-layer-aligner.html](../visual-design/tools/swimmer-layer-aligner.html) if multi-layer
4. Export WebP → `assets/worlds/{worldId}/`
5. Log tuned values in `docs/visual-design/logs/{world}-handoff.md`

### 9.3 Block sheet rules

- 128×128 base tile; corner radius 15–22% per bible
- 3–5 variants: normal, chipped, cracked, dark edge, **warning top** (spike hint for TAP zones later)
- **Danger warmth** must survive color-blind check — value contrast, not hue alone

### 9.4 Parallax rules

- Far layer: low contrast silhouette
- Mid layer: material identity (crystal, moss, etc.)
- **Never** compete with gap read — vignette + lane lift from `swimmerCaveLightingTuning.ts`

### 9.5 Text / UI art

- Gameplay flashes: vector text in-engine (Skia) — **not** baked images (localization + tuning)
- Shop cards: baked illustration 512×320 approx.

---

## 10. Playtest & success criteria

### After each phase — ask players:

1. *Why did you die?* (must answer in plain language)
2. *Did the game reward you when you did something good?*
3. *Do you know what coins are for?*
4. *Does the world look different when you change equip?*

### Metric targets (soft — tune later)

| Signal | Healthy direction |
|--------|-------------------|
| Retry rate after game over | ↑ after Phase 1 |
| Runs per session | 3+ after Phase 2 |
| World unlock engagement | 60%+ players reach 2nd world within first week (hypothesis) |
| Session length | 3–8 min median — **not** climbing to 15+ with one skin |

### Phase completion checklist (founder sign-off)

- [ ] **P1** — I felt CLOSE! and combo at least once per run
- [ ] **P2** — I earned coins and understood why
- [ ] **P3** — I equipped a new world and showed someone without explaining
- [ ] **P4** — Juice matches world
- [ ] **P5** — Shield save felt fair
- [ ] **P6** — Pinball paddles made me smile

---

## 11. Engineering boundaries

| Do | Don’t |
|----|-------|
| Add `WorldSkinId` to session render context | Tie `WorldSkinId` to `rollRunBlueprint` weights |
| Spawn coins in RELEASE rows | Spawn coins that force off-path detours |
| Use death telemetry for **player copy** | Show `generator: pinball` raw debug to player |
| Keep all new tuning in config files | Hardcode in systems |
| Worklet-safe feedback | RN bridge per frame for juice |

**Suggested new modules (names flexible):**

```
src/config/worldSkins.ts
src/config/gameplayFeedback.ts
src/config/coinEconomy.ts
src/Game/meta/worldSkinStorage.ts
src/Game/meta/coinStorage.ts
src/systems/GameplayFeedbackSystem.ts
src/systems/CoinPickupSystem.ts
```

---

## 12. Brainstorm parking lot

*Add ideas here. Promote to a phase only when founder marks priority.*

| Idea | Track | Notes |
|------|-------|-------|
| World #6 Ice Crevasse | B | Bright white-blue; frost blocks |
| World #7 Temple Carved | B | Torch niches |
| Wonder room — giant geode | A | Rare 15-row insert |
| Magnet pickup | Items | |
| Daily featured world discount | Meta | |
| Missions (“collect 50 in one run”) | Meta | risk: clutter |
| Haptics on CLOSE! | A | |
| Near-miss slow-mo 0.1s | A | test sparingly |
| Alt death animations per world | B | |
| JSON silhouette postcards | Visual | T-011 in run-level-progression |
| Run stamp on retry (“Two lanes ahead”) | A | player-facing blueprint hint |
| Combo link to blueprint milestones | Engine | keep separate from world unlocks |
| Revive ad → double coins | Monetization | post-core loop |
| World preview video on shop card | Meta | |
| Biome blend at high best score | B | ice crystals on lava — veteran treat |

**Rejected / parked indefinitely:**

- Mid-run world biome rotation in one session
- Sky = win / escape ending
- Labeling FLOW/TENSION/CLIMAX on HUD
- Darker = progress

---

## 13. Relationship to run-level progression (engine)

The shipped blueprint system remains **geometry scheduler only**:

| Engine concept | Player-facing? | This roadmap |
|----------------|----------------|--------------|
| Opening archetype | Optional stamp only | Layer A — low priority |
| Milestone pools (300/700/1000) | Invisible | Keep for geometry; **optional** soft gates for **world** prices |
| Signature pinballHop | Paddle set-piece | Phase 6 |
| Attempt memory breather | Silent kindness | Optional “Calmer current” stamp when breather retry |
| RELEASE rows | Rest corridor | Phase 2 coins + GREAT! |

**Do not merge** world unlocks into blueprint pools without a new design decision logged in §2.

---

## 14. Next actions (start here)

1. **Founder:** use **[§15](#15-layer-a-skill-feedback--full-implementation-handoff)** to plan Wave 1 (CLOSE/NICE redesign + TAP/SAVED).
2. **Device pass:** verify combo HUD polish (×2 pulse, Tap Streak label, text shadows).
3. **After Wave 1:** tune economy numbers in §8 Phase 2 before coding shop + GREAT!/PERFECT!

---

## 15. Layer A skill feedback — full implementation handoff

**Purpose:** Single entry point for the next major conversation — plan all skill-moment states, copy, detectors, tests, then execute in waves.  
**Do not implement from this section in passing** — use the Wave 1 prompt at [§15.7](#157--future-session-prompt).

### 15.1 — Copy inventory (§7 gameplay flashes)

| Key | Copy | Roadmap phase | On device today | Handoff wave |
|-----|------|---------------|-----------------|--------------|
| `near_miss` | CLOSE! | P1 | Interim (clearance band) | **Wave 1** — redesign |
| `near_miss_alt` | NICE! | P1 | Interim (clearance band) | **Wave 1** — redesign |
| `tap_coach` | TAP | P1 | **Not shipped** | **Wave 1** |
| `tap_saved` | SAVED! | P1 | **Not shipped** | **Wave 1** |
| `combo_2` / `combo_3` | ×2 / ×3 | P1 | Shipped (tap-tier HUD) | **Wave 2** — clean-gap combo |
| `rest_enter` | GREAT! | P2 | **Not shipped** | **Wave 3** (with coins) |
| `rest_perfect` | PERFECT! | P2 | **Not shipped** | **Wave 3** (with coins) |
| `paddle_hit` | +100 | P6 | **Not shipped** | **Wave 4** (set-piece) |
| `new_best` | NEW BEST! | P1 | Shipped | Done |
| _(bonus flyout)_ | +N | P1 | Shipped | Done — tune with Wave 1 |

**Wave 1 = finish P1 skill feedback.** Waves 2–4 cross-link to §8 Phase 2/6 but document triggers here so one conversation owns all Layer A text logic.

### 15.2 — What shipped (interim) + known issues

**Near-miss (CLOSE!/NICE!):**
- Clearance-band MVP: edge-enter on smoothed `clearance01 < 0.35`; CLOSE if `< 0.2`, else NICE
- Issues: CLOSE! rare; one flash per squeeze; clearance ≠ block proximity during rotate/slide; conflicts with original §7 intent (skill moments, not gap width alone)

**TAP / SAVED! (not shipped):**
- Physics exists (`isPinnedFromAbove`, pinned escape in `swimmerHyperCasualPhysics.ts`) but no flash wiring
- §7 intent: repeat `TAP` under ceiling lip; `SAVED!` on escape

**×2 / ×3:**
- Tap streak only (`visualStrokeTier`); not gap-thread skill; "Tap Streak!" label on HUD

**GREAT! / PERFECT!:**
- RELEASE geometry exists (`releaseGenerators.ts`); no row-entry detector or flash

**+100 paddle:**
- Signature `pinballHop` geometry exists; no paddle flash

### 15.3 — Design intent (team discussion)

| Role | Guideline |
|------|-----------|
| **Creative Director** | Praise **felt skill moments**, not one physics number. Player answers "why did the game say that?" in one glance. |
| **Design** | Clearance may still scale **+N bonus** or danger foam — separate from **which word** fires. Max 2 words per flash (L-008). |
| **Engineering** | One overlay (`GameplayFeedbackSystem` + flash pool); per-state detectors emit events; worklet-safe; tutorial gate unchanged. |
| **Art/VFX** | Shared Fredoka flash style; spark ring per state optional (Phase 4 world routing later). |
| **QA** | Matrix test every copy key × scenario; no flashes in tutorial / start / game over. |
| **Production** | Execute **Wave 1 first** (P1 exit criteria). |

### 15.4 — Full state catalog (all Layer A triggers)

Founder sign-off required before coding each row.

| State ID | Copy key | Player moment | Signals today | Detector (proposed) | Priority |
|----------|----------|---------------|---------------|---------------------|----------|
| `gap_thread_tight` | `near_miss` | Brutal gap thread / scrape | `clearance01`, gap px, lateral vx | `gapSkillDetection.ts` | P1 |
| `gap_thread_soft` | `near_miss_alt` | Good steer, not brutal | same + angle delta | same module, softer band OR rotate-aware | P1 |
| `lane_shift_rotate` | `near_miss` or alt | Rotating through shifting lane | angle, direction change, block edge dist | extend gap detector — **not gap width only** | P1 |
| `wall_scrape` | `near_miss` | Side block graze while rising | collision contact side, vx | lateral scrape helper | P1 optional |
| `ceiling_pin_active` | `tap_coach` | Under block lip, need taps | `isPinnedFromAbove`, cramped clearance | `tapCoachDetection.ts` — **repeat flash** while pinned | P1 |
| `ceiling_pin_escape` | `tap_saved` | Cleared pin | pin false edge + min travel | edge on pin exit | P1 |
| `tap_streak_tier` | `combo_2`/`combo_3` | Rapid same-dir taps | `visualStrokeTier` | existing `ScoreHudSystem` | Done |
| `clean_gap_streak` | `combo_2`/`combo_3` | Tight gaps in a row | gap thread counter (new) | `cleanGapCombo.ts` — Wave 2 | P1 follow-up |
| `rest_corridor_enter` | `rest_enter` | RELEASE row mid-run | blueprint row type RELEASE | `restCorridorDetection.ts` | P2 |
| `rest_corridor_perfect` | `rest_perfect` | All corridor coins collected | coin tally vs spawn count | coin system + rest detector | P2 |
| `pinball_paddle_hit` | `paddle_hit` | Timed tap on signature beat | pinball generator + tap window | set-piece system | P6 |
| `open_water` | _(none)_ | Wide channel | high clearance | suppress all above | — |

**TAP coaching — decide in Wave 1 conversation:**
- Triple-flash cadence (ms between TAP pops)
- Anchor: swimmer head vs block lip
- Stop when player taps or escapes
- Gate: `tutorialOpacity > 0` (`gameplayFeedbackGates.ts`)

**SAVED! — decide in Wave 1 conversation:**
- Fire once on pin exit; cooldown vs new pin session
- Bonus +N or copy-only?

### 15.5 — Shared architecture (execution target)

```
src/config/gameplayFeedback.ts       — all copy + tuning per state
src/Game/feedback/
  skillFeedbackTypes.ts            — SkillFeedbackEvent { stateId, copyKey, bonus?, anchor }
  gapSkillDetection.ts             — Wave 1 CLOSE/NICE
  tapCoachDetection.ts             — Wave 1 TAP/SAVED
  restCorridorDetection.ts         — Wave 3 GREAT/PERFECT
  cleanGapCombo.ts                 — Wave 2 HUD combo
  gameplayFeedbackGates.ts         — unchanged
src/systems/GameplayFeedbackSystem.ts — route events → flash pool
src/components/GameplayFeedbackView/  — pool size may need bump for concurrent TAP
```

**Engine signals map:**
- `Swimmer.locomotion.clearance01` — smoothed (`swimmerVisualLocomotion.ts`)
- `Swimmer.isPinnedFromAbove` — `swimmerBlockCollision.ts`
- `visualStrokeTier` / `rapidTapStreak` — tap combo (`swimmerTapInput.ts`)
- `SwimmerWaterContactFxSystem` — clearance for danger foam
- `sampleHorizontalClearancePx` / `gapWidthAtSwimmerX` — raw gap metrics
- `PINNED_ESCAPE_MIN_TAP_TRAVEL` — `swimmerTuning.ts` for SAVED! threshold

### 15.6 — Structured TODO (by wave)

**Wave 1 — Finish P1 skill flashes (recommended first sprint)**

- [ ] **D-001** Founder sign-off: state catalog §15.4 + update §7 "When" column
- [ ] **D-002** CLOSE vs NICE: skill-moment rules (not clearance band alone)
- [ ] **D-003** TAP: repeat cadence, anchor, stop conditions
- [ ] **D-004** SAVED!: one-shot vs bonus; copy-only or +score
- [ ] **E-001** `SkillFeedbackEvent` type + config copy map
- [ ] **E-002** `gapSkillDetection.ts` — replace `pickNearMissCopyByClearance`
- [ ] **E-003** `tapCoachDetection.ts` — pinned + cramped; wire TAP repeat
- [ ] **E-004** SAVED! on pin exit — `PINNED_ESCAPE_MIN_TAP_TRAVEL` threshold
- [ ] **E-005** Extend flash pool if TAP concurrent with CLOSE
- [ ] **E-006** Dev debug overlay: active state + signals
- [ ] **A-001** TAP flash: smaller/different color? or same as CLOSE
- [ ] **QA-001** Unit tests per detector
- [ ] **QA-002** Scenario matrix: 12 runs (gap, pin, open water, tutorial)

**Wave 2 — Clean gap combo (P1 follow-up)**

- [ ] **D-005** ×2/×3 from gap thread vs tap streak — replace, merge, or both?
- [ ] **E-007** `cleanGapCombo.ts` + wire `ScoreHudSystem`
- [ ] **QA-003** Combo resets on sloppy steer (manual)

**Wave 3 — Rest corridor flashes (Phase 2 — with coins)**

- [ ] **D-006** GREAT! trigger: row entry vs midpoint
- [ ] **D-007** PERFECT!: all coins vs speed threshold
- [ ] **E-008** `restCorridorDetection.ts` + RELEASE row hook
- [ ] **E-009** Coin pickup tally for PERFECT
- [ ] **A-002** Rest light pocket VFX (Mud Flood default)

**Wave 4 — Set-piece (Phase 6)**

- [ ] **E-010** `paddle_hit` +100 flyout on pinball tap window
- [ ] **A-003** Per-world paddle art (Phase 4/6)

### 15.7 — Future session prompt

Copy-paste into a new Cursor session:

```text
Read docs/game-design/player-experience-roadmap.md §15 (Layer A skill feedback handoff)
and docs/visual-design/logs/phase1-skill-feedback-handoff.md.

Goal: Plan and execute Wave 1 — replace interim clearance-band CLOSE!/NICE! with
skill-moment detectors; ship TAP (repeat) and SAVED! ceiling-pin coaching.

Do NOT start Wave 3 (GREAT/PERFECT/coins) until Wave 1 passes QA matrix.

Already on device:
- GameplayFeedbackSystem + flash pool (+N flyout)
- Interim clearance near-miss (to be replaced)
- ×2/×3 tap-tier HUD + Tap Streak label (pulse + text shadow)
- Death line, NEW BEST!, gameplayFeedbackGates

Deliver: gapSkillDetection + tapCoachDetection, tests, §7 table updated,
founder device pass on §15.6 Wave 1 checklist.
```

### 15.8 — Roadmap cross-links

- Phase 1 §8: CLOSE!/NICE! **interim — Wave 1**; TAP/SAVED **§15 Wave 1**
- Phase 1 follow-up: clean gap combo → **Wave 2**
- Phase 2: GREAT!/PERFECT! → **Wave 3** (with coin economy)
- Phase 6: paddle +100 → **Wave 4**

---

## Document changelog

| Date | Change |
|------|--------|
| 2026-06-28 | v1 — initial roadmap from founder creative sessions |
| 2026-06-28 | P1 partial — skill feedback MVP shipped (see `docs/visual-design/logs/phase1-skill-feedback-handoff.md`) |
| 2026-06-29 | §15 full Layer A handoff; combo HUD polish; RNTGE text shadows |

---

*This is the living blueprint. When a phase ships, check boxes in §8 and write a handoff log — don’t let the doc drift from what’s on device.*
