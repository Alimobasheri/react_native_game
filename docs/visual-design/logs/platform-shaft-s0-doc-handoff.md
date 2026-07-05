# Platform Shaft Slice 0 — Doc + Grid SSOT Handoff

**Date:** 2026-07-04  
**Roadmap:** [platform-shaft-roadmap.md](../../game-design/platform-shaft-roadmap.md) §9 Slice 0

## Done

| Item | Path / value |
|------|----------------|
| Platform shaft roadmap (§0–§11) | `docs/game-design/platform-shaft-roadmap.md` |
| Main hazard doc link + §5.6 stub | `docs/game-design/stage-hazard-progression-roadmap.md` |
| SH-007 → **6-column** grid | same file §2 |
| Slice 2 footnote → platform-shaft doc | same file §11 |
| Open questions Q6–Q7 (PS-TODO) | same file §14 |
| Player experience 6-col + companion row | `docs/game-design/player-experience-roadmap.md` |
| Game designer LLM context 6 cols | `src/docs/game-designer-llm-context.md` |
| Backlog code anchor | `src/Game/hazards/platformShaftTODO.ts` |

## Locked numbers / rules

| Key | Value |
|-----|-------|
| `LAYOUT_CONSTANTS.COLUMNS` | 6 (`Layout.ts`) |
| `minResidualGapCols` | **1** (PS-003) |
| Slab retract | **off** v1 (PS-001) |
| Full seal vs far wall | **forbidden** (PS-002) |

## Not done (next slice)

| ID | Task | Start file |
|----|------|------------|
| S1.1 | Lab `pressTeachSingle` + harmonizer | `scripts/stage-design-lab/hazard-generators.js` |
| S1.2 | Rename `6of8`/`2of8` preset labels | same + `hazard-catalog.js` |
| S1.3 | Fairness min-residual messaging | `scripts/stage-design-lab/fairness-v2.js` |
| S1.4 | Engine harmonizer + tests | `src/Game/path/platformShaft/harmonizer.ts` |

## Key paths

- `docs/game-design/platform-shaft-roadmap.md`
- `docs/game-design/stage-hazard-progression-roadmap.md`
- `stage-composer-exports/one-sided-platforms-variations/`
- `scripts/stage-design-lab/hazard-sim.js`
- `src/Game/hazards/platformShaftTODO.ts`

## Constraints

- Machinery art ≠ orange clay (SH-011)
- Pick **one slice** from platform-shaft-roadmap §9; visual test before next slice
- Lab fairness must pass before engine wiring

## Future prompt

```text
Read docs/visual-design/logs/platform-shaft-s0-doc-handoff.md and docs/game-design/platform-shaft-roadmap.md §9 Slice 1.

Task: Implement Slice 1 — lab harmonizer + pressTeachSingle recipe.

Done already:
- platform-shaft-roadmap.md exists with PS-001–PS-007
- stage-hazard doc links + SH-007 = 6 cols
- platformShaftTODO.ts backlog stub

Implement:
1. pressTeachSingle + capPressCols + harmonizePlatformBeat in hazard-generators.js
2. widePreset/narrowPreset label rename (6of8/2of8)
3. minResidualGapCols=1 fairness messaging
4. src/Game/path/platformShaft/harmonizer.ts + unit tests

Visual pass: lab export PNG, fairnessReport.ok, 1-col narrowest gap.

Start with a short plan. Do not enable PS-TODO sharp hazards.
```
