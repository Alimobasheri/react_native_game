# Phase 1 skill feedback — handoff

**Updated:** 2026-06-28  
**Scope:** Player-experience-roadmap P1 partial (CLOSE!, +N, combo badge, death line)

---

## Done

| Area | Path / value |
|------|----------------|
| Tuning | `src/config/gameplayFeedback.ts` — `ENABLED`, `NEAR_PIN_CLEARANCE01: 0.35`, cooldown `900`, bonus `10–25`, `NICE_ALT_WEIGHT: 0.3` |
| Death copy | `src/config/deathCopy.ts` — `SHOW_GENERATOR_SUFFIX: true` (set `false` for cause-only) |
| Pure logic | `src/Game/feedback/*` — near-miss, flash anim, gates, death line |
| System | `src/systems/GameplayFeedbackSystem.ts` |
| View | `src/components/GameplayFeedbackView/GameplayFeedbackView-rntge.tsx` |
| Combo HUD | `ScoreHudSystem` + `comboBadge` role — reads `visualStrokeTier` (tap combo) |
| Death subtitle | `GameOverScreenSystem` + `session.lastDeathContext` |
| Tests | `src/Game/feedback/__tests__/` — 30 tests green |
| Story mount | `Swimmer.stories.tsx` — `GameplayFeedbackView` + component registration |
| Restart reset | `RestartGameplaySystem` — `resetGameplayFeedbackManager` |

---

## Not done

**A. TAP / SAVED! coaching**  
- Symptom: no `TAP` flashes or `SAVED!` on ceiling escape  
- Files: extend `GameplayFeedbackSystem` or new `tapCoachDetection.ts`; pin + cramped state from `Swimmer.isPinnedFromAbove`, `clearance01`  
- Constraint: block while `computeTutorialOpacity > 0`

**B. Clean gap combo (replace or augment tap-tier badge)**  
- Symptom: ×2/×3 reflects rapid same-direction taps, not tight gap threading  
- Files: new detector in `src/Game/feedback/cleanGapCombo.ts`; wire `ScoreHudSystem`  
- Constraint: do not tie to blueprint weights

**C. Device tuning pass**  
- Tune `gameplayFeedback.ts` cooldown/bonus after 10 founder runs  
- Verify combo badge hides when `visualStrokeTier` resets

**D. Spark art**  
- Optional sprite; Skia circle ring works (`SHOW_SPARK_RING`)

---

## Key paths

```
src/config/gameplayFeedback.ts
src/config/deathCopy.ts
src/Game/feedback/
src/systems/GameplayFeedbackSystem.ts
src/components/GameplayFeedbackView/GameplayFeedbackView-rntge.tsx
src/systems/ScoreHudSystem.ts
docs/game-design/player-experience-roadmap.md
```

---

## Constraints

- Game code only — no `RNTGE.tsx` edits  
- Fredoka Bold for gameplay flashes (not Montserrat)  
- Death line never shows engine phase names (`flow`, `climax`, etc.)  
- Generator suffix: `deathCopyTuning.SHOW_GENERATOR_SUFFIX`

---

## Future prompt

```text
Read docs/visual-design/logs/phase1-skill-feedback-handoff.md and docs/game-design/player-experience-roadmap.md Phase 1 follow-up.

Task: Ship TAP/SAVED coaching and/or clean-gap combo badge (founder picks A or B first).

Done already:
- CLOSE!/NICE! + real +N score via GameplayFeedbackSystem
- Death subtitle from lastDeathContext
- ×2/×3 tap-tier combo on ScoreHud
- 30 unit tests in src/Game/feedback/__tests__/

Implement: items A and/or B from Not done section; add tests; tune on device.
```
