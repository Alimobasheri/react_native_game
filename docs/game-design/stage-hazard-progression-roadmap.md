# Stage Hazard Progression — Master Roadmap

**Status:** Draft v1.1 (2026-07-04) — **authoritative blueprint** for visible stage chapters, hazard vocabulary, and skill-feedback pivot  
**Audience:** Founder, implementers, future agent sessions  
**Supersedes for stage/hazard work:** Passage-timing Track 3 flow streak + trail (partially reverted on device); **semantics** in [passage-timing-roadmap.md](./passage-timing-roadmap.md) §1–2 for praise/streak are **deprecated** per §3 below.

**Companion docs (do not duplicate — link and extend):**

| Doc | Owns |
|-----|------|
| [player-experience-roadmap.md](./player-experience-roadmap.md) | Layer A/B meta, phases P0–P7, copy deck voice, world skins, coins |
| [run-level-progression.md](./run-level-progression.md) | Run blueprint, opening archetypes, milestone pools, attempt memory |
| [passage-timing-roadmap.md](./passage-timing-roadmap.md) | **Partially superseded** — keep Track 1 physics (pin strict, bounce, stage speed hold); retire flow streak / perfect-seam praise as primary loop |
| [platform-shaft-roadmap.md](./platform-shaft-roadmap.md) | Press-shaft hazard family: one-sided steel platforms, recipes, harmonizer, flow force, dev visual locks, slice handoffs |
| [../../src/docs/game-designer-llm-context.md](../../src/docs/game-designer-llm-context.md) | Core loop, grid, death rules |

---

## 0. How to use this document

1. **Read §2 locked decisions** before coding — do not re-litigate product direction.
2. **Stage identity** (§5–§6) and **hazard catalog** (§7–§8) are the primary creative SSOT for “each stage looks and plays different.”
3. **Skill feedback** (§4) replaces passage-timing flow streak as the in-run reward model.
4. **Pick one implementation slice** from §11 — ship player-visible chapter beats before deep hazard animation.
5. **Update checkboxes** in §11 and log handoffs under `docs/visual-design/logs/`.
6. **Flow streak removal:** codebase may still contain `flowStreak.ts`, HUD wiring, and passage-timing eval hooks — remove in a dedicated cleanup pass after this doc is signed off (§12).

---

## 1. North star — product rule (locked)

> **Each stage** = one full directed-path loop (FLOW → TENSION → CLIMAX → RELEASE) with a **visible chapter identity**: name, tint, **one signature hazard family**, and **one pattern family** — not just faster water.  
> **Player fantasy:** Rising flood survival — read ahead, steer in gaps, escape pin crises, survive the squeeze, earn REST payoff, enter the **next cave chapter** with new dangers telegraphed.  
> **Not the fantasy:** Flappy Dunk perfect tap at every seam; Dune comet from consecutive zero-scrape passages; rhythm-chart tap contracts on every row.

**One-sentence pitch for store / playtest:**

> Same thumb, rising water, **new hazard every stage** — clamp gates, pinch pipes, buzz wheels — survive long enough to see Stage 4.

---

## 2. Locked design decisions

| ID | Decision | Rationale | Invalidates |
|----|----------|-----------|-------------|
| **SH-001** | **Stage progression = visible chapters** — name overlay, persistent HUD badge, water/block tint shift, REST “Stage N done”, ghost preview of **next** hazard | Speed-only stages feel like one long tunnel; market needs 3-second readability | Stage = speed increment only |
| **SH-002** | **One signature hazard family per stage** (teach in FLOW, combo in CLIMAX) | Cave Climber / Lava Leap biome model — variety without new core verbs | Same static gap vocabulary every stage |
| **SH-003** | **Primary skill feedback = survival navigation**, not perfect gap-shift timing | Game is rising/swerve/pin — not tap/rhythm ([Mobile F2P rising/swerve taxonomy](https://mobilefreetoplay.com/tag/hyper-casual-game-ideas/)) | Flow streak on consecutive perfect passages; NICE! every shift |
| **SH-004** | **REST corridor = chapter punctuation** — coins, GREAT!, dim optional heat trail, **preview next hazard** | Hybrid-casual retention; Jelly Jump periodic reward beat | REST as silent geometry only |
| **SH-005** | **Fairness invariant unchanged** — timed hazards must keep ≥1 reachable lane until telegraph ends | Same as multipath overlap in `proceduralGaps.ts` | Impossible clamp with no telegraph |
| **SH-006** | **Pin-heavy hazards → TAP/SAVED!**; **steer-wide hazards → Near Miss / scrape** | Death model + existing detectors | Instant fail on every hazard touch without pin read |
| **SH-007** | **6-column grid SSOT** — all hazards express as column masks, entities, or timed mask phases | `Layout.ts` (`LAYOUT_CONSTANTS.COLUMNS = 6`) | Free-floating 3D obby geometry |
| **SH-008** | **Flow streak + comet trail (passage-timing Track 3) — deprecate** | Founder reverted trail work; forced praise misaligned with loop | PT-004 flow streak HUD; PT-005 trail-on-perfect |
| **SH-009** | **Keep passage-timing Track 1 physics** — pin strict, bounce disruptor, stage-constant speed, RELEASE ramp | Body honesty still valuable | — |
| **SH-010** | **World skins (Layer B) orthogonal to stage hazards** — stage hazard art can reuse default world until Phase 3 | L-002 equipped world fixed per run | Per-world hazard rules in v1 |
| **SH-011** | **Moving platforms ≠ orange cave blocks** — iris clamps, tilt gates, vise jaws, crushers use **machinery art** (metal compressor plates, flat pans, hinged flaps); static **orange clay** remains ceiling/wall pin geometry only | Style bible L-009 orange = static block danger; motion hazards need distinct read in &lt;0.3s | Re-skinning moving hazards as `swimmerBlocks` orange tiles; animating orange block sprites in place |

---

## 3. Pivot — skill feedback (replaces flow streak)

### 3.1 What went wrong (founder-validated)

- **NICE! / perfect passage / flow streak** copied **tap/timing** games (Flappy Dunk, Dune smooth landing) onto a **navigation + pin survival** game.
- Many rows have **no meaningful gap-shift seam**; wide chutes and REST make streaks rare or meaningless.
- **Acceptable = silence + streak break** punishes normal messy navigation.
- **Track 4 rhythm schema** (tap contracts) is wrong metaphor — park indefinitely.

### 3.2 Target skill model (80 / 15 / 5)

| Tier | Skills | Copy / juice | Status |
|------|--------|--------------|--------|
| **Primary (80%)** | Pin escape, near pin, REST arrival, stage chapter beat | TAP, SAVED!, Near Miss!, GREAT!, Stage N | Near miss + TAP shipped; REST Phase 2 |
| **Secondary (15%)** | Set-piece clean (pinball, snap), fork read, pre-position in narrow segment | SWEEP!, FORKED!, optional path-gated tier | Partially shipped — gate to `branchKey` |
| **Demote (5%)** | Generic gap-shift NICE! | Silence or kill | Deprecate as default praise |

### 3.3 Replace flow streak — **survival heat** (recommended)

Stateful visual reward tied to **time/rows without pin threat**, not zero-scrape seams.

| State | Rule | Player eyes |
|-------|------|-------------|
| **Heat builds** | No pin latch, no hard block for N seconds or M row crosses | Aqua wake / lane lift grows |
| **Heat breaks** | Pin threat, hard block, death | Trail dies; bounce if hard fail (Track 1) |
| **Scrape OK** | Soft rim contact does not break heat | Messy navigation still rewarded |
| **REST (PT-011 spirit)** | Dim trail; **preserve heat count** | Gold comet dims; GREAT! + coins |
| **Stage step** | Brief gold pulse + overlay | “Stage 3 — Buzz Cavern” |

**Alternatives (pick one, don't stack all):**

- **Gate-pass combo (DeepSwim):** ×2/×3/×5 on consecutive row crosses without pin — words only at high tiers.
- **Stage score multiplier:** +0.5× per `stageIndex`; shown in REST corridor.

**Implementation note:** Reuse `flowStreak.ts` / trail VFX **machinery** if desired — **rename semantics** to `survivalHeat` and rebind triggers; or delete flow streak in cleanup pass (§12).

### 3.4 Research references (genre fit)

| Game | Take | Don't take |
|------|------|------------|
| [DeepSwim](https://play.google.com/store/apps/details?id=com.deepswim.game) | Gate combo + narrow escape | Hold/release swim axis |
| [Subway Surfers](https://medium.com/myappfree/subway-surfers-success-formula-revealed-99e3c249042b) | Near-miss dopamine, distance score | Lane snap at speed |
| [Jelly Jump](https://apps.apple.com/us/app/jelly-jump/id955327604) | Closing platforms, variable speed | Jump-only, no lateral steer |
| [Sling Tomb](https://ozogames.com/game/sling-tomb/) | Buzz saws, rising water, hazard variety | Slingshot climb verb |
| [Cave Climber](https://www.mattrclark.com/projects/cave-climber) | Zone = unique mechanic | 3D climb |
| [Lava Leap](https://github.com/denrod25-del/lava-leap) | Named biomes at thresholds, tint + speed | Separate codebase |
| [Dune!](https://play.google.com/store/apps/details?id=io.voodoo.dune) | Comet after sustained smooth **feel** | Landing-as-every-beat timing |
| Flappy Dunk / Geometry Dash | — | Perfect tap every gap |

---

## 4. Stage chapter model

### 4.1 What the player must see per stage

```
STAGE N opens
  ├─ ~0.8s overlay: "Stage N — [NAME]" + hazard icon silhouette
  ├─ Persistent HUD: "Stage N" badge (never hidden mid-run)
  ├─ Water tint + block material micro-shift (even before full world skins)
  ├─ FLOW: teach signature hazard — wide, telegraphed
  ├─ TENSION: hazard + existing generators (funnel, paradox)
  ├─ CLIMAX: hazard combo (e.g. clamp + buzz wheel)
  ├─ RELEASE: wide corridor, coins, GREAT!, optional heat dim
  └─ "Stage N done" → visible speed ramp → Stage N+1 intro
```

### 4.2 Stage roster (v1 target)

| Stage | Display name | Signature hazard | Pattern family | Notes |
|-------|--------------|------------------|----------------|-------|
| **1** | Flood Shaft | *(none — static gaps)* | Chute + REST | Current shipped baseline; teach steer + pin |
| **2** | Pinch Pipe | **Vise rows** | Side squeeze sequences | Multi-row narrowing; gap center may drift |
| **3** | Drawbridge Den | **Iris clamp** + **Tilt gate** | Variable-width closing | 6/8 vs 2/8 open presets; asymmetric flap timing |
| **4** | Buzz Cavern | **Buzz wheel** | Drifting gap + pinwheel | Spin VFX; column/circle hitbox |
| **5** | Pinball Vault | **Paddle set-piece** | Signature pinball hop | Phase 6; BOING zip |
| **6** | Crush Tube | **Vertical piston** (floor + ceiling) | Timing dodge via wait/rush | Bounce penalty; grey track telegraph; TAP if pin after bounce |
| **7+** | *(pool)* | Mix 2 hazards / stage | Blueprint + `stageIndex` table | Expand after Slice 1–5 feel good |

### 4.3 REST as chapter punctuation

| Element | Player-visible | Gameplay |
|---------|----------------|----------|
| Wide RELEASE geometry | Light pocket, coins | Existing `releaseGenerators.ts` |
| `GREAT!` on corridor entry | Word flash | Phase 2 |
| `PERFECT!` all coins collected | Word flash | Phase 2 |
| Heat trail dim | Comet fades, count preserved | PT-011 spirit |
| **Next hazard ghost** | Translucent silhouette at corridor end | New — telegraph Stage N+1 |
| One-line preview | e.g. "Next: Buzz wheels" | New — optional copy key `stage_preview_*` |

---

## 5. Hazard catalog — founder ideas + specs

### 5.0 Visual identity — cave blocks vs moving machinery

**Critical read rule:** Moving platforms are **obstacle geometry that moves** — they occupy grid columns and can pin/block like static solids — but they must **not** look like the existing orange clay cave blocks.

| Object family | Visual | Player read | Collision |
|---------------|--------|-------------|-----------|
| **Static cave blocks** | Warm orange / yellow **clay** — rounded squares from `swimmerBlocks` sheet | “Cave ceiling and walls — pin me if I’m under them” | Pin + side block (shipped) |
| **Moving machinery** | **Cool metal** — flat compressor pans, hinged steel flaps, sliding vise jaws, industrial plates | “This **machine** is closing — get through the gap before it seals” | Same physics; **different render + entity type** |
| **Spin hazards** (buzz wheel) | Chrome / dark steel disc, red edge glow or teeth — **not clay orange** | “Spinning cutter — steer wide” | Entity hitbox (§8) |

**Why separate art:** Orange blocks = ever-present cave geology. Machinery = **stage chapter gimmick** — player instantly knows “Stage 3 = metal gates,” not “same blocks but wiggling.”

**Material keywords (AI / art pipeline):**

- Brushed steel, dark iron, rust edge, bolt heads, hydraulic piston hint
- **Flat pan** / **compressor plate** — horizontal slab that slides on rails
- **Hinged flap** — drawbridge segment with visible pivot pin
- **Vise jaw** — two thick metal cheeks closing inward (not two orange blocks)
- Warning: amber **stripe** or blinking edge light on machinery — not the same warm clay as static blocks

**Silhouette at 64px width:** Machinery reads as **horizontal bar or angled plate**; static blocks read as **chunky rounded cube**.

**Engine implication:** Do not animate `ObstacleRow` orange block sprites for moving hazards. Spawn **`MovingHazard` entities** (or row-attached machinery render layers) with their own WebP/sheet — collision mask follows machinery motion, not block tile swap.

**World skins (Phase 3+):** Machinery tints per world (crystal chrome, ember scorched metal) — **shape language stays industrial**, never recolored to orange clay.

---

### 5.1 Iris clamp gates (Jelly Jump–style, with steer)

**IDs:** `hazard_iris_clamp`  
**Player name:** **Clamp!** (flash) / "Closing slabs"

**Visual:** Pair of **flat metal compressor pans** on rails — slide inward from left/right walls. Gap between pans = safe water. Variable closure = pans stop at different inset (wide vs narrow seal). **Not** orange block columns.

**Behavior:** Row spawns **open** (pans retracted). Machinery **slides inward** over 0.4–1.2s, shrinking gap. **Variable width:** one row closes to ~6/8 open, next to ~2/8.

**Player job:** Read telegraph → **pre-center** → tap through before pin — navigation, not single beat tap.

**Telegraph:** Amber stripe on pan leading edge + subtle piston glow 1–2 rows before motion; low rumble SFX stub.

**Fail:** Pin under closing pan (preferred) or hard block.

**Inspiration:** [Jelly Jump](https://writerparty.com/party/jelly-jump-by-ketchapp-tips-tricks-cheats-and-strategy-guide/) closing platforms; adapted for 8-col lateral steer.

---

### 5.2 Tilt gates / drawbridge flaps

**IDs:** `hazard_tilt_gate`  
**Player name:** **Drop!** / "Drawbridge"

**Visual:** **Hinged steel flap** — vertical when open (gap beside it), rotates down to horizontal seal. Visible pivot bolt at wall edge. Twin variant = two flaps from opposite sides. **Not** a rotating orange block.

**Behavior:** Machinery on one side **rotates from vertical (90°) to horizontal (0°)** — rotation VFX + timed column mask. Safe window slides as flap drops. **Twin flaps:** left then right with offset (e.g. 0.3s).

**Variants:** Single-side drop; twin asymmetric; fixed opposite wall so gap migrates.

**Fail:** Pin under dropped flap.

**Inspiration:** Only Up–style rotating obstacles; obby broken-bridge segments ([Escape from the water](https://freejoy.games/en/games/escape-from-the-water-robby-296882.html)).

---

### 5.3 Vise rows / pinch corridors

**IDs:** `hazard_vise`  
**Player name:** **Squeeze!**

**Visual:** **Vise jaws** — thick horizontal metal cheeks on left/right (flat pan profile), advancing inward row-by-row. Optional drift = whole jaw pair shifts on rails while closing. Long horizontal **pinch platforms** = same jaw language across 3–6 rows — not a sequence of orange blocks getting narrower.

**Behavior:** **3–6 consecutive rows** — jaw columns **advance inward** one column per row (or every 2 rows). Gap narrows. Optional **drift:** gap center shifts while narrowing.

**Player job:** Early read → hold center → steer through sequence.

**Fail:** Pin or scrape survival (scrape OK for heat).

**Relation to shipped:** Evolves `tensionFunnel` / `flowChicane` into **multi-row animated sequence** with stronger stage identity.

---

### 5.4 Buzz wheels (pinwheel saws)

**IDs:** `hazard_buzz_wheel`  
**Player name:** **Buzz!**

**Behavior:** Toothed disc — **spin VFX**; hitbox = circle or single column. Placement modes:

| Mode | Read | Stage tier |
|------|------|------------|
| Fixed in gap column | "Don't swim here" | 4 intro |
| Slow L/R drift | "Wait for opening" | 4 tension |
| Half-submerged at waterline | Interacts with pin/surface | 5+ |
| Between two lanes | Forces lane commit | CLIMAX |

**Fail:** Hard block or instant scrape+bounce — **pick one globally**.

**Art:** Dark steel / chrome **buzz wheel** — triangular teeth on rim, red edge highlight or spin motion blur. **Not** orange clay. Readable at 64px width.

**Proto in codebase:** `SharpObstacle` (downward triangle) — buzz wheel is **horizontal spin cousin**.

**Inspiration:** [Sling Tomb](https://ozogames.com/game/sling-tomb/) buzz saws.

---

### 5.5 Long horizontal pinch platforms (founder)

Covered by **§5.3 Vise rows** + optional **sliding gap** (§6.2) — sequences of horizontal bands that narrow from sides or shift position row-to-row.

---

### 5.6 One-sided press platforms (steel slabs)

**IDs:** `hazard_platform`  
**Player name:** *(optional flash)* / "Press shaft"

**Visual:** **Flat steel compressor slab** on one wall — slides inward, **holds** (no retract v1). Distinct from orange clay (SH-011). Narrowest gap = **1 open column** on 6-col grid (not full seal against far wall).

**Behavior:** Timed row-attached machinery mask; optional flow force into shrinking lane. Recipes: teach single, pinball pair, stack cascade, opposite-wall squeeze.

**Full spec + slices:** [platform-shaft-roadmap.md](./platform-shaft-roadmap.md) — do not duplicate here.

---

### 5.7 Vertical piston (track-mounted timing gate)

**IDs:** `hazard_piston`  
**Player name:** **Piston!** / "Crush tube"

**Visual:** Thin dark-grey (`#555555`) vertical track + crimson elongated head. Track visible the moment the row enters. Head telegraphs with a bright pulse (~0.5s) before motion. Machinery art — **not** orange clay (SH-011).

**Behavior:**

| Mount | Player verb |
|-------|-------------|
| **Floor** | Wait — water lifts you above the tip, then tap across |
| **Ceiling** | Rush — dart under before it descends |

Ping-pong ease-in-out along track; speed in rows/sec independent of water. Collision = **bounce** (away-X + down-Y), never instant kill. Grey track = 100% path predictability.

**Fairness:** Inner cols 1–4 only; ≥2 clear rows beyond max extension; adjacent escape column open; rest gaps stay connected for water. Spawns after `gapDifficulty01 > 0.35` in FLOW / early TENSION only.

**Architecture + deferred juice:** [moving-hazard-system-architecture.md](./moving-hazard-system-architecture.md) §6.1; `platformShaftTODO.ts` PS-TODO-006…012.

**Story locks:** `LockedPistonFloorLoop` / `LockedPistonCeilingLoop` in `Swimmer.stories.tsx`.

---

## 6. Additional hazard & pattern ideas (backlog)

### 6.1 Water & pressure (uses existing water systems)

| ID | Name | Behavior |
|----|------|----------|
| `hazard_geyser` | Side jet | One column pushes swimmer laterally toward wall/saw |
| `hazard_backwash` | Wrong-way current | 1s lateral pull against safe lane; foam arrow telegraph |
| `hazard_low_air` | Low ceiling | Ceiling drops 1 row — pin threat, no new art |
| `hazard_false_floor` | False gap | Looks open until water row engulfs — extends false wall CLIMAX |

### 6.2 Moving geometry (grid-native)

| ID | Name | Behavior |
|----|------|----------|
| `pattern_sliding_gap` | Sliding lane | Safe columns drift L→R over 4 rows |
| `pattern_conveyor` | Escalator blocks | Blocks shift 1 col/row same direction |
| `pattern_stagger_teeth` | Stagger spikes | Ceiling triangle teeth alternating — chicane + sharp art |
| `pattern_broken_bridge` | Broken bridge | 2-row gap with missing center on middle row |

### 6.3 Set-pieces & ambient

| ID | Name | When |
|----|------|------|
| `setpiece_paddle` | Pinball zip | CLIMAX signature (Phase 6) |
| `ambient_whale_rib` | Coin arch | Rare REST/wonder insert |
| `ambient_tnt_crack` | Cracking block | Block falls into gap after delay — Cave Climber TNT |

---

## 7. Copy deck — stage & hazard flashes

**Rule:** ≤2 words (L-008). Add rows here before coding new strings.

| Key | Copy | When |
|-----|------|------|
| `stage_intro` | Stage N — {name} | Stage open overlay |
| `stage_done` | Stage N done | RELEASE → next boundary |
| `stage_preview` | Next: {hazard} | REST corridor end |
| `rest_enter` | GREAT! | REST entry (Phase 2) |
| `rest_perfect` | PERFECT! | All corridor coins (Phase 2) |
| `hazard_clamp` | Clamp! | Optional — first iris in stage |
| `hazard_drop` | Drop! | Tilt gate telegraph |
| `hazard_squeeze` | Squeeze! | Vise sequence start |
| `hazard_buzz` | Buzz! | Buzz wheel near-miss or first spawn |
| `near_miss` | Near Miss! … | Shipped |
| `tap_saved` | SAVED! | Shipped |
| ~~`shift_commit`~~ | ~~NICE!~~ | **Demote** — narrow shift + set-piece only |
| ~~`flow_streak_*`~~ | ~~ON FIRE!~~ | **Remove** with flow streak cleanup |

---

## 8. Engineering architecture

### 8.1 Current baseline

| Piece | Location | Stage/hazard fit |
|-------|----------|------------------|
| Row spawn | `ObstacleSystem.ts` | Static gap bitmasks per row |
| Generators | `flowGenerators.ts`, `tensionGenerators.ts`, `climaxGenerators.ts`, `releaseGenerators.ts` | Pattern families — extend per stage |
| Stage speed | `stageProgression.ts`, `StageSpeedSystem.ts` | Constant speed per `stageIndex` ✅ |
| Stage overlay | `StageOverlaySystem.ts`, `StageOverlayView-rntge.tsx` | Intro / done / persistent HUD ✅ |
| Pacing | `pacingDirector.ts` | FLOW/TENSION/CLIMAX/RELEASE within stage |
| Collision | `swimmerBlockCollision.ts` | Pin, block, scrape |
| Sharp proto | `SharpObstacle-rntge.tsx` | Spike triangle — extend to buzz wheel entity |

### 8.2 Hazard implementation paths

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE TABLE (new) — stageIndex → { name, hazardPool, tint, … }   │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ GENERATION — existing pacing + stage-gated generator weights     │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────┐                         ┌───────────────────┐
│ PATH A — Timed    │                         │ PATH B — Hazard   │
│ row mask phases   │                         │ entities          │
│ iris, tilt, vise  │                         │ buzz wheel, …     │
└───────────────────┘                         └───────────────────┘
        │                                               │
        └───────────────────────┬───────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ COLLISION + FEEDBACK — pin / block / near miss / heat trail      │
└─────────────────────────────────────────────────────────────────┘
```

| Path | Best for | Notes |
|------|----------|-------|
| **A — Timed row phases** | Iris clamp, tilt gate, vise sequences | **Machinery entities** or row-attached metal layers; collision mask animates — **do not** reuse orange `swimmerBlocks` sprites |
| **B — Hazard entities** | Buzz wheel, future sweepers | ECS entity + dedicated render sheet; static orange blocks may remain on ceiling independently |
| **C — Stage routing table** | All | `stageIndex` → allowed hazards + generator weights + `visualThemeId` |

**Render split (SH-011):**

```
ObstacleRow (static)     → orange clay blocks → pin / ceiling read
MovingHazard (dynamic)   → metal pans, flaps, jaws, saws → stage gimmick read
```

| Piece | Location (proposed) |
|-------|---------------------|
| Machinery sprites | `assets/hazards/` — compressor pan, tilt flap, vise jaw, buzz wheel |
| Render builder | `buildMovingHazardRenderLayers.ts` (or extend obstacle render with `hazardKind`) |
| Component | `MovingHazard.ts` — kind, phase, column range, motion state |

**Fairness (SH-005):** Every timed change keeps ≥1 reachable lane until telegraph completes; validate in headless sim per stage at S1–S4 speeds.

### 8.3 Proposed modules (names flexible)

| Module | Responsibility |
|--------|----------------|
| `src/config/stageHazardProgression.ts` | Stage roster, hazard unlock per index, tint tokens |
| `src/config/survivalHeat.ts` | Heat build/break thresholds (replaces `flowStreak.ts` semantics) |
| `src/Game/path/stageHazardGenerators.ts` | Vise, clamp, tilt row builders |
| `src/Game/hazards/` | Entity factories, timed mask FSM, telegraph metadata |
| `src/systems/HazardMotionSystem.ts` | Per-frame mask/entity updates (worklet-safe) |
| `src/systems/StageHazardRoutingSystem.ts` | Bind `stageIndex` to generator pool |

---

## 9. Relationship to existing roadmaps

| Doc / system | Interaction |
|--------------|-------------|
| **passage-timing Track 1** | Keep pin strict, bounce, stage speed ✅ |
| **passage-timing Track 2** | `passageTimingEval` optional for set-piece tier only — not global NICE! |
| **passage-timing Track 3** | **Deprecate** flow streak HUD, trail-on-perfect, word escalation |
| **passage-timing Track 4** | **Park** rhythm schema |
| **player-experience P2** | REST coins + GREAT! align with §4.3 |
| **player-experience P3** | World skins tint hazards via reactive tokens — no new hazard rules |
| **run-level-progression** | Run blueprint = **which opening**; stage hazards = **within-run chapters** — orthogonal |

---

## 10. 30-second store video beat sheet

| Time | Must read instantly |
|------|---------------------|
| 0–2s | Green swimmer, rising aqua water, **orange clay blocks** = static cave pin danger |
| 2–5s | Thumb tap, steer, water curves through gap |
| 5–10s | Squeeze → near pin → TAP TAP → **SAVED!** |
| 10–15s | Bright REST, coins, **GREAT!** |
| 15–20s | **Stage 3 — Drawbridge Den**, **metal pans clamp** shut — clearly not orange blocks |
| 20–25s | Buzz wheel spin, narrow dodge |
| 25–30s | Die pinned → retry → world skin tease |

If **NICE!** flashes on a wide chute, cut it — reads as broken Flappy clone.

---

## 11. Implementation tracks (ordered)

```
Slice 1 Stage identity ──► Slice 2 Vise rows ──► Slice 3 Iris clamp
                                                      │
Slice 4 Buzz wheel ◄─── Slice 5 Tilt gate ◄──────────┘
         │
Slice 6 Survival heat (rebind trail) ──► Slice 7 Flow streak cleanup
         │
Phase 2 REST coins + preview ghost (parallel art)
```

### Slice 1 — Stage identity (no new hazards)

**Goal:** Player feels chapters before new art.

| Task | Exit |
|------|------|
| S1.1 Stage names table + `stageIndex` → display name | Overlay shows "Stage 2 — Pinch Pipe" |
| S1.2 Persistent HUD stage badge | Always visible |
| S1.3 Micro tint shift per stage (water + block highlight) | Side-by-side Stage 1 vs 2 obvious |
| S1.4 REST "Stage N done" + relax ramp telegraph | D8-style device pass |

**Estimate:** 3–5 days

---

### Slice 2 — Vise rows (generator-only)

**Goal:** Stage 2 pattern without animation system.

| Task | Exit |
|------|------|
| S2.1 `hazard_vise` multi-row generator | 3–6 row squeeze sequences |
| S2.2 Optional gap center drift | Readable on device |
| S2.3 Stage 2 gates generator weight | Stage 1 never spawns vise |
| S2.4 Headless reachability tests | No impossible sequences |

**Estimate:** 1 sprint

> **Press-shaft chapters** (steel one-sided platforms) — see [platform-shaft-roadmap.md](./platform-shaft-roadmap.md). Ships after Slice 1 stage identity; parallel to / extends Slice 2 vise.

---

### Slice 3 — Iris clamp (timed row phase A)

**Goal:** Stage 3 closing slabs, variable width.

| Task | Exit |
|------|------|
| S3.1 Timed mask FSM on row approach | Open → closing → closed hold |
| S3.2 Width presets 6/8 and 2/8 | Distinct reads |
| S3.3 Telegraph art (amber edge stripe on **metal pan**, not clay warning top) | Player learns machinery vs cave blocks |
| S3.4 Pin on late entry | TAP coach fires under threat |

**Estimate:** 1–2 sprints

---

### Slice 4 — Buzz wheel (entity B)

**Goal:** Stage 4 pinwheel hazard.

| Task | Exit |
|------|------|
| S4.1 Buzz wheel entity + spin VFX | Readable at 64px |
| S4.2 Fixed + slow drift modes | Stage 4 FLOW vs CLIMAX |
| S4.3 Collision policy (hard vs scrape) | One global rule documented |
| S4.4 Near Miss integration on close pass | Optional |

**Estimate:** 1 sprint

---

### Slice 5 — Tilt gate

**Goal:** Drawbridge rotation + timed mask.

| Task | Exit |
|------|------|
| S5.1 Rotate VFX + column mask sync | Drop reads as "gate" |
| S5.2 Twin-flap offset variant | Stage 3+ CLIMAX |
| S5.3 Combine with iris (CLIMAX only) | Stage 3 finale beat |

**Estimate:** 1 sprint

---

### Slice 6 — Survival heat (feedback rebind)

**Goal:** Replace flow streak feel without perfect-seam semantics.

| Task | Exit |
|------|------|
| S6.1 `survivalHeat.ts` — build/break on pin threat | Unit tests |
| S6.2 Rebind trail VFX to heat (if trail returns) | Visible after ~5–8s clean |
| S6.3 REST dim, preserve count | PT-011 spirit |
| S6.4 Remove flow streak from HUD / praise bonus | No ×N from perfect passages |

**Estimate:** 3–5 days (after founder sign-off on thresholds)

---

### Slice 7 — Flow streak code cleanup

**Goal:** Remove deprecated passage-timing Track 3 surface.

| Task | Exit |
|------|------|
| S7.1 Delete or gut `flowStreak.ts`, flow streak state on `GameplayFeedbackManager` | No dead HUD |
| S7.2 Remove flow streak from `praiseRouter`, `ScoreHudSystem`, diag | Grep clean |
| S7.3 Update passage-timing-roadmap header → superseded by this doc | Doc consistency |
| S7.4 Demote `shift_commit` NICE! to path-gated narrow shifts only | Wide chute silence |

**Estimate:** 2–3 days

---

### Phase 2 parallel — REST economy + preview ghost

| Task | Exit |
|------|------|
| P2.1 Coins in RELEASE rows | Meta progress visible |
| P2.2 GREAT! / PERFECT! | Phase 2 promise |
| P2.3 Next-hazard ghost mesh at corridor end | Stage N+1 readable |

---

## 12. Deprecation & cleanup checklist

**Founder note (2026-07-04):** Working tree cleaned of flow trail VFX work; flow streak removal follows.

- [ ] Remove `FlowTrailVisualSystem` / trail shader hooks if still present
- [ ] Remove or rename `flowStreak.ts` → `survivalHeat.ts`
- [ ] HUD: drop flow streak ×N badge
- [ ] `praiseBonus`: drop flow streak multiplier
- [ ] Mark passage-timing §1 north star **historical** — link this doc
- [ ] Keep: `StageSpeedSystem`, pin strict, bounce disruptor, Near Miss, TAP, SAVED!

---

## 13. Test matrix (device)

| # | Scenario | Expected |
|---|----------|----------|
| D1 | Stage 1 → 2 boundary | Name overlay + tint + HUD update |
| D2 | Stage 2 vise sequence | Gap narrows; survivable with steer |
| D3 | Stage 3 iris 2/8 clamp | Pin if late; telegraph visible |
| D4 | Stage 4 buzz wheel drift | Steer wide; collision matches policy |
| D5 | REST after Stage 2 | GREAT! + ghost preview Stage 3 hazard |
| D6 | Heat trail 8s no pin | Trail on; pin breaks trail |
| D7 | Wide chute Stage 1 | No NICE! spam |
| D8 | Death → retry | `stageIndex` session behavior unchanged |

---

## 14. Open questions (founder)

| # | Question | Default if silent |
|---|----------|-------------------|
| Q1 | Buzz wheel — hard block or scrape-only? | Hard block |
| Q2 | Survival heat vs gate-pass combo vs both? | Survival heat only |
| Q3 | Stage names fixed roster vs procedural adjectives? | Fixed roster §4.2 |
| Q4 | Iris + tilt in same stage or alternate stages? | Both in Stage 3 CLIMAX combo |
| Q5 | When to delete flow streak code vs rebind? | Rebind heat first, delete in Slice 7 |
| Q6 | Press shaft — sharp hazards on blocks/slab for danger without full seal? | Defer PS-TODO-002/003 — see [platform-shaft-roadmap.md §10](./platform-shaft-roadmap.md#10-backlog--deferred-ps-todo) |
| Q7 | Multi-layer water for true slab seal? | Defer PS-TODO-001 — min residual 1 col for v1 |

---

## Document changelog

| Date | Change |
|------|--------|
| 2026-07-04 | v1.0 — Initial roadmap: stage chapter model, hazard catalog (iris, tilt, vise, buzz wheel), survival heat pivot, flow streak deprecation, implementation slices, research refs |
| 2026-07-04 | v1.1 — **SH-011** moving platforms = machinery art (compressor pans, metal flaps, vise jaws) — **not** orange cave blocks; §5.0 visual identity; engineering render split |
| 2026-07-04 | v1.2 — **SH-007** corrected to **6-column** grid; §5.6 press platforms stub; link to [platform-shaft-roadmap.md](./platform-shaft-roadmap.md); Q6–Q7 open questions |
| 2026-07-18 | v1.3 — §5.7 Vertical piston; Stage 6 Crush Tube = floor/ceiling piston timing gate (gameplay-complete; polish deferred) |

---

*When a slice ships, check boxes in §11, append handoff under `docs/visual-design/logs/`, and tune in `stageHazardProgression.ts` / `survivalHeat.ts` — not in praise detectors alone.*
