# Phase 1 skill feedback — handoff

**Updated:** 2026-06-29  
**Scope:** Player-experience-roadmap P1 — skill-moment praise (Wave 2 survival)

---

## Done

| Area | Path / value |
|------|----------------|
| Skill tuning | `src/config/skillFeedback.ts` — `survivalRamp`, `hygiene`, pathGates, bonus weights |
| Survival gates | `src/Game/feedback/skillSurvivalGates.ts` — `resolveSkillGates`, `evaluateCrossQualified` |
| Hygiene stitch | `src/Game/feedback/hygieneScoring.ts` — per-frame `updateStitchSampler`, `computeHygiene01` |
| Path analysis | `src/Game/feedback/gapPathAnalysis.ts` — run-then-break, monotonic travel, chicane break |
| Lane topology | `src/Game/feedback/gapTopology.ts` — `laneClusterTopology` (full cluster, not swimmer-col) |
| Row snapshots | `rowCrossEval.ts` — `contact`, `crossQualified`, `rawGaps` + lane cluster |
| Dedupe | `rowCrossHistory.ts` — runway skip on `rawGaps` |
| Detectors | steer/snap two-axis flow; ceiling/tap unchanged |
| Bonus | `praiseBonus.ts` — clearance + `hygiene01` → +N only |
| Router | `praiseRouter.ts` — difficulty-scaled steer cooldown override |
| System | `src/systems/GameplayFeedbackSystem.ts` — per-frame contact stitch |
| Flash VFX | `src/config/gameplayFeedback.ts` — layout only; 3 word + 2 bonus slots |
| View | `src/components/GameplayFeedbackView/GameplayFeedbackView-rntge.tsx` |
| Combo HUD | `ScoreHudSystem` — tap ×2/×3 (separate from steer praise) |
| Tests | `src/Game/feedback/__tests__/` — 87 unit tests |

---

## Ignition rules (Wave 2)

- **Path merit unchanged** — lane cluster geometry drives pattern detection.
- **Soft cross gate** — `crossQualified` replaces hard `cleanCross` for steer/snap; difficulty-scaled forgiveness.
- **Base tier on survival** — messy hard runs get SURFING!/ZIG-ZAG! tier 0.
- **Hygiene upgrades tier + +N** — clean window → MAJESTIC!/ZIG-ZAG KING! and larger bonus (`hygiene01 ≥ 0.72`).
- **Wide static chute + tap around → silence** — path merit unchanged from Wave 1.1.
- **Payoff row pinned → no steer/snap** — TAP/SAVED! track unchanged.
- **Per-frame stitch** — side/ceiling/colliding OR-accumulated between row crosses.
- **Swimmer-steer required (Wave 2.1 fix)** — path praise tracks `swimmerCol` delta, not procedural gap drift alone. Passive conveyor (gaps move, player column fixed) → silence.
- **High-speed stitch (Wave 2.2 fix)** — per-frame fractional column min/max in contact window catches steer between fast row-cross snapshots; `swimmerSteerMinSpan` scales down with speed/difficulty.
- **Runway dup rows** — identical `rawGaps` skips steer/snap eval; stitch still updates each frame. History always attempts append on row cross.

---

## Not done (next)

- **Phase 2:** GREAT!/PERFECT! + coins
- **Optional:** clean-gap combo HUD (founder deferred)
- **Device tuning:** `survivalRamp` / `hygiene` after 10 founder runs on hard segments

---

## Device QA checklist (Wave 2)

1. Tap freely in wide opener chute — **zero** steer flashes.
2. Hard tension cross-lane with scrapes each row — **SURFING!** fires (tier 0).
3. Same segment clean, no contact — **MAJESTIC!** + bigger +N.
4. Payoff row pinned — **TAP** not SURFING.
5. Pinhole→flare→snap — **SWEEP!** (not SURFING!).
6. TAP / CLOSE! / ×2 HUD still work.

---

## Verify

```bash
npm test -- --watchAll=false src/Game/feedback/__tests__
```
