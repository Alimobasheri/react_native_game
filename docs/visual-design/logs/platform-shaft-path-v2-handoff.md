# Platform Shaft Path v2 — Handoff

**Updated:** 2026-07-07  
**Scope:** P3 corner_stack derive + gap-shift runway + runtime vanish fixes

---

## Mindset (read first)

1. **Gap shifts are the game** — path = where the thumb moves (gaps). Blocks and steel decorate that path.
2. **Path-first, hazards-second** — `PathRowIntent` → shaft flow plan → `deriveShafts`. Never bolt on “approach rows” or “escape patches” after hazards fail playtests.
3. **Stateful lookahead** — Each shaft flow kind (`ShaftFlowKind`) owns its phase planner. `corner_stack` plans escalate → peak → deescalate → gap_shift_runway per segment between center constraints.
4. **Fair crush** — Stacks may reach 1-col at peak. Escape is **deescalating steel** (opening lane) + minimal zero-steel runway — not “no shafts until pin.”
5. **One algorithm, not patches** — Gap-shift budget matches chicane: ~1 col lateral move per `GAP_SHIFT_ROWS_PER_COL` wide rows. See `gapShiftPlan.ts`.

Full SSOT: [platform-shaft-path-v2-spec.md §3.8](../../game-design/platform-shaft-path-v2-spec.md)

---

## Done (cumulative)

| Item | Path |
|------|------|
| v2 tuning stubs | `src/config/platformShaftTuning.ts` |
| PathRowIntent + chicane path | `pathIntent/pathGenerators.ts` — `composePathChicane` |
| Ceiling pin policy | `pathIntent/ceilingPinPolicy.ts` |
| Row-clock timing | `shaftScheduler/rowClock.ts` |
| **P3 deriveShafts** | `shaftScheduler/deriveShafts.ts` |
| **Gap-shift helpers** | `pathIntent/gapShiftPlan.ts` |
| **Shaft flow types** | `shaftScheduler/shaftFlowTypes.ts` — `ShaftFlowKind`, `CornerStackPhase` |
| **Corner-stack planner** | `shaftScheduler/cornerStackFlowPlan.ts` — `planCornerStackFlow` |
| **Flow dispatch** | `shaftScheduler/planShaftFlow.ts` |
| **Passage planner** | `shaftScheduler/passagePlanner.ts` |
| **pathChicaneShaft recipe** | `composePathChicaneShaft.ts` — `shaftFlowKind: 'corner_stack'` |
| Passage + corner-stack tests | `shaftScheduler/__tests__/`, `pathIntent/__tests__/gapShiftPlan.test.ts` |
| **Runtime: hazard vanish / loop** | `hazardBandSpawn.ts`, `mergeRowHazardPass.ts`, `gridAnchor.ts`, `ObstacleSystem.ts` rollover |
| **Dev diag dump** | `src/Game/debug/platformShaftVanishDiag.ts`, Storybook button |

---

## Not done

| ID | Task | Notes |
|----|------|-------|
| A | Lab path preview PNG | `scripts/stage-design-lab/` |
| B | Lab mirror for `cornerStackFlowPlan` | JS twin of derive + phases |
| C | Additional `ShaftFlowKind` planners | pinball, squeeze trap, gap ladder — **new kinds**, don't extend corner_stack |
| D | P4 stack grouper + stagger | `stackGrouper.ts` |
| E | P6 path lateral momentum | `pathLateralMomentum.ts` |
| F | P7 path recipes | `pathPinballWave`, etc. |
| G | Deprecate v1 recipe composers | after v2 parity |

---

## Rejected approaches (do not reintroduce)

| Approach | Why it failed |
|----------|----------------|
| `stackTailPolicy` ceiling-approach / pure-escape ranks | Patch on top of hazards; sparse steel or impossible pins |
| Global `gapShiftBudgetExceeded` → skip all steel | No 1-col peak; wall-only at high difficulty |
| Loop rollover `purgePlatformShaftHazards` | Killed visible tail collision |
| Runtime `appendGapShiftRunwayRows` on platformShaftIntro | Duplicate beat rows |

---

## Key paths

```
docs/game-design/platform-shaft-path-v2-spec.md          # §3.8 gap-shift + shaft flows
src/Game/path/platformShaft/shaftScheduler/shaftFlowTypes.ts
src/Game/path/platformShaft/shaftScheduler/cornerStackFlowPlan.ts
src/Game/path/platformShaft/shaftScheduler/deriveShafts.ts
src/Game/path/platformShaft/composePathChicaneShaft.ts
src/Game/path/platformShaft/pathIntent/gapShiftPlan.ts
src/Game/debug/platformShaftVanishDiag.ts
```

---

## Constraints

- Path-first; hazards derived in P3 only
- Row-clock: `pressDurationRows` preferred
- Worklet-safe compose modules
- New shaft behaviors → new `ShaftFlowKind`, not more patches in `deriveShafts`
- corner_stack only for crush-to-corner directed stacks

---

## Future prompt

```text
Read docs/visual-design/logs/platform-shaft-path-v2-handoff.md and platform-shaft-path-v2-spec.md §3.8.

P3 corner_stack is shipped: planCornerStackFlow → deriveShafts. Mindset: gap-shift first.

Next: lab PNG (A), or new ShaftFlowKind for pathPinballWave (C). Do NOT re-add approach-row patches.
```
