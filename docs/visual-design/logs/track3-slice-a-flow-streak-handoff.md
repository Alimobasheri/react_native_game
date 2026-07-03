# Track 3 Slice A — Flow Streak + HUD + Bonus Mult Handoff

**Date:** 2026-07-03  
**Roadmap:** [passage-timing-roadmap.md](../../game-design/passage-timing-roadmap.md) §9 Track 3 Slice A

## Before → after (player eyes)

| Moment | Before | After |
|--------|--------|-------|
| **1st clean gap-shift seam** | Tap `×2` on fast taps | HUD `×2` + `Flow Streak` label; +N doubled on praise |
| **Each next clean seam** | Tap `×3` cap | HUD `×3`, `×4`, `×5`… **no cap** |
| **Rim scrape at seam** | Silence (Track 2) | Streak resets; badge hidden |
| **Pin anywhere** | TAP coach | Streak resets immediately |
| **Fast tap chain, no seam** | `×2`/`×3` tap badge | **No HUD combo** — tap impulse unchanged (PT-015) |

## Shipped modules

| Module | Role |
|--------|------|
| `src/config/flowStreak.ts` | Uncapped streak value helpers (first perfect = 2, then +1) |
| `src/Game/feedback/flowStreak.ts` | Seam detect, tier eval, increment/break state machine |
| `skillFeedbackTypes.ts` | `FlowStreakState` on `SkillFeedbackState` |
| `GameplayFeedbackSystem.ts` | Per-frame pin/hard-block break; seam cross update; bonus mult |
| `ScoreHudSystem.ts` | HUD reads flow streak (not `visualStrokeTier`) |
| `praiseBonus.ts` | `flowStreakValue` multiplier on +N flyout |

## Streak rules (locked)

- **Increment:** gap-shift seam + `perfect` tier (physics sampler; no steer proof required)
- **Break:** pin or hard block (any frame); acceptable/failed at seam
- **HUD:** `×${count}` when count ≥ 2; label `Flow Streak`
- **Bonus:** same numeric mult as HUD (post-increment on praise frame)

## Tuning keys

| Concern | File |
|---------|------|
| Streak ignite / HUD helpers | `src/config/flowStreak.ts` |
| Passage collision / pin | `src/config/swimmerTuning.ts` |
| Praise copy | `src/config/skillFeedback.ts` |

## Tests

```bash
npm test -- --watchAll=false src/Game/feedback/__tests__/flowStreak.test.ts src/Game/feedback/__tests__/praiseBonus.test.ts
```

## Device checklist (founder — deferred)

| ID | Check |
|----|-------|
| D1 | Clean pinball seam → HUD ×2, NICE! |
| D2 | Rim scrape → silence + streak break |
| D3 | Hard block → bounce + streak 0 |
| D4 | 3 perfect seams → ×4 HUD |
| D7 | Pin → streak break without seam |

## Deferred (next slices)

- **T2.6** — silence SURFING!/SLALOM!/SWEEP! on scrape (acceptable tier on all passage skills)
- **T3.2** — trail VFX / comet wake while streak ≥ 2
- **T3.4** — `zigzag_passage` geometry detector
- **T3.5** — streak word flashes (needs 20+ copy pool — not started)
- **PT-011** — REST corridor trail dim (preserve streak)
- **Known gap** — scrape cross_sweep may still praise while seam streak broke
