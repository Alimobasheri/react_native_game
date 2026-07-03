# Track 2 Slice A — Passage Timing Eval Handoff

**Date:** 2026-07-03  
**Roadmap:** [passage-timing-roadmap.md](../game-design/passage-timing-roadmap.md) §9 Track 2

## Before → after (player eyes)

| Moment | Before | After |
|--------|--------|-------|
| **Clean pinball seam cross** | NICE! / SMOOTH! | Same — `perfect` tier |
| **Rim scrape, survive cross** | NICE! | **Silence** — `acceptable`, no word, no +N |
| **Hard side block in passage** | Bounce (Track 1) | Bounce + `failed` in diag — no word |
| **Alt-tap on straight chute** | ZIG-ZAG! | **Off** — `zigzag_tap` disabled (PT-007) |

## Shipped modules

| Module | Role |
|--------|------|
| `passageTimingEval.ts` | `evaluatePassageTimingTier` — perfect / acceptable / failed |
| `passageTiming.ts` | `commitWindowByStageIndex` scaffold (Slice B: gapBlend gate) |
| `steerPraiseDetection.ts` | `evaluateShiftCommit` returns `tier`; event only on `perfect` |
| `skillFeedback.ts` | `zigzag_tap.enabled: false` |

## Tuning keys

| Concern | File |
|---------|------|
| Commit windows (Slice B) | `src/config/passageTiming.ts` → `commitWindowByStageIndex` |
| Stage speed (unchanged) | `src/config/stageProgression.ts` |

## Tests

```bash
npm test -- --watchAll=false src/Game/feedback/__tests__
```

## Device checklist (founder)

| ID | Check |
|----|-------|
| D2 | Rim scrape pinball → survive, no NICE! |
| D6 | Alt-tap straight chute → no ZIG-ZAG! |

## Deferred to Slice B / Track 2 remainder

- `passageSegment.ts` multi-row FSM (T2.1)
- `gapBlend` commit window — perfect requires tap in window (T2.4)
- Passage timing gate on slalom / cross_sweep / fork / snap
- `flowStreak.ts` / trail / HUD (Track 3)
