# Track 2 Slice A — Passage Timing Eval Handoff

**Date:** 2026-07-03  
**Roadmap:** [passage-timing-roadmap.md](../game-design/passage-timing-roadmap.md) §9 Track 2  
**Clarification (PT-016):** [track2-physics-passage-timing-clarification.md](./track2-physics-passage-timing-clarification.md)

## Before → after (player eyes)

| Moment | Before | After |
|--------|--------|-------|
| **Clean pinball seam cross** | NICE! / SMOOTH! | Same — `perfect` tier |
| **Rim scrape, survive cross** | NICE! | **Silence** — `acceptable`, no word, no +N |
| **Hard side block in passage** | Bounce (Track 1) | Bounce + `failed` in diag — no word |
| **Alt-tap on straight chute** | ZIG-ZAG! | **Off** — `zigzag_tap` disabled (PT-007) |
| **Carried by current, no tap, clean seam** | NICE! | Same — `perfect` (physics outcome, PT-016) |

## Shipped modules

| Module | Role |
|--------|------|
| `passageTimingEval.ts` | `evaluatePassageTimingTier` — perfect / acceptable / failed from `PassageFlowSampler` |
| `steerPraiseDetection.ts` | `evaluateShiftCommit` returns `tier`; event only on `perfect` |
| `skillFeedback.ts` | `zigzag_tap.enabled: false` |
| `passageFlowScoring.ts` | Per-frame sampler — rim scrape, pin, hard block (physics authority) |

## Tuning keys

| Concern | File |
|---------|------|
| Passage collision / pin / bounce | `src/config/swimmerTuning.ts` |
| Praise copy / steer tiers | `src/config/skillFeedback.ts` |
| Stage speed (unchanged) | `src/config/stageProgression.ts` |

**No `passageTiming.ts`** — rejected gapBlend config gate (PT-016).

## Tests

```bash
npm test -- --watchAll=false src/Game/feedback/__tests__
```

## Device checklist (founder)

| ID | Check |
|----|-------|
| D2 | Rim scrape pinball → survive, no NICE! |
| D6 | Alt-tap straight chute → no ZIG-ZAG! |

## Deferred (next tracks)

- Extend timing tier gate to snap / slalom / fork / cross_sweep (T2.6)
- `flowStreak.ts` / trail / HUD (Track 3)
- Optional `passageSegment` id for flow streak diag only — not a timing rule
- Device fidelity fixes if collision→sampler misses rim/pin reads
