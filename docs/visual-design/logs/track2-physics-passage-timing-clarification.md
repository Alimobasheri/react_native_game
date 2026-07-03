# Track 2 — Physics-defined passage timing (clarification)

**Date:** 2026-07-03  
**Roadmap:** [passage-timing-roadmap.md](../../game-design/passage-timing-roadmap.md) §2 PT-016  
**Supersedes:** Slice B plan (`gapBlend` commit-window gate, `passageTiming.ts` config)

---

## What we learned

**Perfect timing is not a designer-drawn clock.** It is whatever the collision + pin physics already allow when the swimmer threads a **gap-shift seam** cleanly.

### Flappy Dunk basket mental model

Gap shifts left (example):

- **Current row:** block on the **left** — the **rim** on the shift side.
- **Next row:** block on the **right** — closes from above; pin threat if you arrive late.
- **Perfect:** rise through the opening — no rim scrape, no pin under the closing block. Swish. NICE!
- **Acceptable:** graze a rim, still rise through — silence (PT-012).
- **Failed:** hard side block or pin — bounce, no word (PT-006).

Tap timing matters **because physics punishes early/late** (rim vs pin), not because feedback samples tap timestamps or `gapBlend` fractions. Water current can carry the swimmer through a clean seam with **zero taps** — still perfect.

### What “commit window” means (conceptual only)

The set of moments a player **could** still pass cleanly given block geometry, vertical speed, horizontal speed, and water pull. That corridor is **simulated** by `swimmerBlockCollision.ts` + `SwimmerPhysicsSystem.ts`. Feedback **observes** outcomes; it does not define a parallel timing band.

**Invalid approach (removed):** `commitWindowByStageIndex` in config, sampling `gapBlend` at tap frame, enforcing `gapBlend ∈ [0.15, 0.75]` for perfect.

---

## Shipped authority chain (Track 2 core — `shift_commit`)

```
Per frame (between row crosses)
  GameplayFeedbackSystem → updateContactWindow
    → passageFlowSampler: pinnedSeen, hardBlockSeen, softScrapeSeen, steer span

On row cross (gap-shift seam)
  evaluateShiftCommit → evaluatePassageTimingTier
    perfect   = crossQualified + passageIsClean + steer proof + topology shift
    acceptable = crossQualified + intact + soft scrape (no word)
    failed    = pin or hard block in passage (bounce)
```

| Module | Role |
|--------|------|
| `passageFlowScoring.ts` | Per-frame passage sampler (physics contact outcomes) |
| `passageTimingEval.ts` | Tier from sampler — **no gapBlend, no tap clock** |
| `steerPraiseDetection.ts` | NICE!/SMOOTH! only on `perfect` tier |
| `swimmerBlockCollision.ts` | Rim, side block, ceiling pin — source of truth |

**Removed:** `src/config/passageTiming.ts` (unused scaffold).

---

## Player eyes (authoritative)

| Moment | Tier | Feedback |
|--------|------|----------|
| Clean basket thread through shift | perfect | NICE! / SMOOTH! |
| Rim scrape, survive | acceptable | Silence |
| Hard block or pin in passage | failed | Bounce, silence |
| Carried by current, no tap, clean | perfect | NICE! |

---

## Next work (not timing-window code)

| Priority | Track | Notes |
|----------|-------|-------|
| 1 | **Track 3** | Flow streak + trail on consecutive `perfect` |
| 2 | Device fidelity | If false NICE! or missed silence → fix collision→sampler wiring, not new timing math |
| 3 | Extend tier gate | `snap_transfer`, slalom, fork — same sampler rules |
| Optional | `passageSegment` FSM | Diag / flow-streak segment id only — not a timing rule |

---

## Doc/code cleanup (this session)

- [passage-timing-roadmap.md](../../game-design/passage-timing-roadmap.md) — PT-016, glossary, §4.6, Track 2 tasks, config index
- [track2-slice-a-passage-timing-handoff.md](./track2-slice-a-passage-timing-handoff.md) — remove `passageTiming.ts` references
- [player-experience-roadmap.md](../../game-design/player-experience-roadmap.md) — config SSOT pointers
