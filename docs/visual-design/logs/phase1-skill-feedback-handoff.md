# Phase 1 skill feedback — handoff

**Updated:** 2026-06-29  
**Scope:** Player-experience-roadmap P1 — skill-moment praise system (Wave 1 shipped)

---

## Done

| Area | Path / value |
|------|----------------|
| Skill tuning | `src/config/skillFeedback.ts` — all copy, tiers, thresholds, bonus weights |
| Flash VFX | `src/config/gameplayFeedback.ts` — layout only; 3 word + 2 bonus slots |
| Detectors | `src/Game/feedback/` — gapTopology, rowCrossHistory, snapTransfer, steerPraise, ceilingDodge, tapCoach, praiseBonus, praiseRouter, praiseEmitter |
| Collision signal | `swimmerBlockCollision.ts` — `ceilingBrushContact`; `Swimmer.ceilingBrushThisFrame` |
| System | `src/systems/GameplayFeedbackSystem.ts` — row-cross orchestration |
| View | `src/components/GameplayFeedbackView/GameplayFeedbackView-rntge.tsx` |
| Combo HUD | `ScoreHudSystem` — tap ×2/×3 (separate from steer praise) |
| Death copy | `src/config/deathCopy.ts` |
| Tests | `src/Game/feedback/__tests__/` — 50+ unit tests |
| Restart reset | `resetGameplayFeedbackManager` |

---

## Ignition rules (locked)

- **Copy fires on skill moments** — row-cross geometry, ceiling brush, pin coach.
- **`clearance01` scales +N only** — never selects copy.
- **Runway dup rows** — identical `gaps` skips steer/snap eval.
- **Tap streak HUD** — unchanged; not merged with steer praise.

---

## Not done (next)

- **Phase 2:** GREAT!/PERFECT! + coins (`restCorridorDetection.ts`)
- **Optional:** clean-gap combo HUD (founder deferred)
- **Device tuning:** `skillFeedback.ts` tiers/cooldowns after 10 founder runs

---

## Key paths

```
src/config/skillFeedback.ts
src/config/gameplayFeedback.ts
src/Game/feedback/
src/systems/GameplayFeedbackSystem.ts
src/components/GameplayFeedbackView/GameplayFeedbackView-rntge.tsx
docs/game-design/player-experience-roadmap.md §7 §15
```

---

## Constraints

- Game code only — no `RNTGE.tsx` edits
- Fredoka Bold for gameplay flashes
- Tutorial gate: `gameplayFeedbackGates.ts`

---

## Verify

```bash
npm test -- --watchAll=false src/Game/feedback/__tests__
```
