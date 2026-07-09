# Platform Shaft — Recipe Fun & Progression Spec

**Status:** Design SSOT for Slice 4+ recipes  
**Parent:** [platform-shaft-roadmap.md](./platform-shaft-roadmap.md) §4  
**Audience:** Founder, implementers, tuning sessions

---

## Core loop contract

**Player fantasy:** Rising flood lifts you. Gray steel slides from one wall. Water channel snaps toward **one column**. Thumb steers into the lane before the slab finishes — late = pin + water shove.

**Non-negotiables:**
- 6 columns; **1 open col** at narrowest (PS-003)
- Slab **presses and holds** — no retract (PS-001)
- **SH-005:** every row overlaps previous by ≥1 col
- **Tap still wins** over flow on cheap phones
- Macro arc invisible to player: **FLOW → TENSION → CLIMAX → RELEASE**

**Variables that change feel:**

| Knob | Player feel |
|------|-------------|
| `pressDurationSec` | Squeeze window — slow = teachable, fast = panic |
| `pressEase` | `ease-out` = readable decel; `ease-in` = ambush at end |
| `animStartRow` / telegraph lead | Steel visible before water hits slab row |
| `rowSpan` | Tall slab = longer threat + stronger flow |
| `gapWidthCols` + `centerCol` + drift | Rest corridor width and where 1-col survivor lands |
| `oppositeWallInset` | Far wall eats space — hug-near-side geometry |
| `difficulty01` | Lerp all recipe tuning — less runway, faster press |
| `seed` | Side flip, chicane direction, harmonizer reroll |
| `raisingSpeed` | Scales row scroll time, not press seconds |

---

## Recipe catalog

### `pressTeachSingle` (atomic · tests only)

**3s read:** One gray wall. 2-col corridor. Slab eats 1. End in **1 col**.

**Fun:** First vocabulary — steel ≠ orange. Low challenge; failure = "I didn't move."

---

### `composePressIntroShaft` (shipped intro chapter)

**3s read:** Runway → right press → breathe → left press → chicane → stack ×2 → climax → release.

**Fun:** Mini full arc; each segment teaches the next recipe gesture without naming it.

**Variability:** `seed % 2` mirrors chicane + stack/climax sides; `difficulty01` shortens runway/breathe/release and speeds stack/climax.

---

### `pressPinballPair` (S4 · TENSION)

**3s read:** Slab from left squeezes right. Before you settle, slab from right squeezes back.

**Fun:** Handoff fantasy — first press creates false confidence; second invalidates that column. Clever play = pre-commit to third column during first squeeze.

**Challenge:** Timing + prediction. Must read next side from steel telegraph.

**Variables:** Alternate `side` mandatory; chicane drift between presses; press2 duration < press1 at hard; compound flow when windows overlap.

**Failure feel:** "I stayed in the lane from the first press."

---

### `pressStackCascade` (S4 · TENSION / CLIMAX)

**3s read:** Thin slabs, one row each, same wall, staggered — stairs closing. Water surges 3→2→**1**.

**Fun:** Jelly Jump escalator dread. Sequence is the threat; one freeze cascades into compound flow push.

**Variables:** `rowSpan=1`; `animStartLocalRow` stagger; `ease-in` on final step; `FLOW_SURFACE_SURGE_BUMP` at center-row press.

---

### `pressOppositeWall` (S4 · TENSION)

**3s read:** Far orange wall already blocks corridor. Near-side steel only. Hug the press wall.

**Fun:** Flips default mental model — safe lane is asymmetric, not centered.

**Variables:** `oppositeWallInset`; `centerCol` biased toward press side.

---

### `pressTandem` (S6 CLIMAX atom)

**3s read:** Two slabs, overlapping press windows — one col survives in overlap; timing picks which col.

**Fun:** CLIMAX pin crisis. Highest challenge; only after pinball + stack literacy.

---

### `pressBreather` (RELEASE atom)

**3s read:** Wide corridor, slow press, coins after. Contrast juice after CLIMAX.

---

### `pressMixedBeat` (S4)

**3s read:** teach tease → pinball → stack → squeeze → breather in one strip.

---

## Chapter compositions (S6)

| Chapter | Arc | Player memory |
|---------|-----|---------------|
| Pinball Press | teach → pinball pair → breather | "It bounces me left-right" |
| Stack Shaft | teach → stack cascade → tandem | "Stairs then double crush" |
| Squeeze Shaft | opposite-wall → stack → breather | "Hug the wall" |
| Mixed Press | handoff strip | "Everything in one run" |

**Progression:** Stage 1 = intro only. Stage 2+ = pool draw. Recipe literacy stacks across runs.

---

## Hyper-casual realism

**Works:** One verb (steer) + one readable object (steel). Failure blame is positional. Flow ties visual to physics. 1-col reads as danger on 6-col phone.

**Locked out:** Full seal, retract stroke, 2-col residual at narrowest, random side mid-press.

---

## S4 acceptance

Each recipe passes when a non-dev names the gesture in **3 seconds** of locked Storybook loop. Fairness: headless tests + lab `fairnessReport.ok`.
