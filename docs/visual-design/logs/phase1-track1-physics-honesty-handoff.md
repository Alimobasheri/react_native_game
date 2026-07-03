# Track 1 — Physics Honesty Handoff

**Date:** 2026-07-02  
**Roadmap:** [passage-timing-roadmap.md](../game-design/passage-timing-roadmap.md) §9 Track 1

## Before → after (player eyes)

| Moment | Before | After |
|--------|--------|-------|
| **Pin under ceiling, no taps** | Water current slowly slides swimmer sideways out of pin column | Lateral advection off; body bleeds residual vx via damping, then stuck until TAP |
| **Within a stage (FLOW/TENSION/CLIMAX)** | Speed creeps up every second (`WATER_SPEED_ACCELERATION`) | Flat hold at `computeStageConstantSpeed(base, stageIndex)` |
| **RELEASE corridor** | Same unnoticed creep | Visible relax accel toward next stage speed — telegraphs "next chapter is faster" |
| **RELEASE → FLOW boundary** | Gradual drift | `stageIndex++`; snap to new constant (+`STAGE_SPEED_INCREMENT` per stage) |
| **Hard side block** | Bounce config lived in `skillFeedback` shift_commit (broken / wrong layer) | Physics-owned bounce: kill vx, small rebound, squash + foam from `bounceDisruptorTuning` |

## Tuning keys (device pass)

| Concern | File |
|---------|------|
| Stage constant + RELEASE ramp | `src/config/stageProgression.ts` → `STAGE_SPEED_INCREMENT`, `STAGE_RELAX_ACCEL_PER_SECOND` |
| Pin lateral block | `src/config/swimmerTuning.ts` → `PINNED_BLOCK_WATER_CURRENT_ADVECTION` |
| Bounce disruptor | `src/config/swimmerTuning.ts` → `bounceDisruptorTuning` |
| Deprecated continuous accel | `waterPhysicsTuning.WATER_SPEED_ACCELERATION_PER_SECOND` (unused) |

## Systems touched

- `StageSpeedSystem` — constant `raisingSpeed` per `stageIndex`; RELEASE relax accel; step on RELEASE→FLOW
- `WaterPhysicsSystem` — gap/flow/calmness only; no per-frame speed lerp
- `SwimmerPhysicsSystem` — pin advection gate + bounce disruptor
- Diag: `skillFeedbackDiag` live fields `pacingPhase`, `stageIndex`, `stageConstantSpeed`, `baseSpeed`

## Tests

```bash
npm test -- --watchAll=false \
  src/Game/characters/__tests__/swimmerPinnedWaterCurrent.test.ts \
  src/Game/characters/__tests__/swimmerBounceDisruptor.test.ts \
  src/systems/PhysicsSystem/__tests__/stageSpeed.test.ts \
  src/Game/feedback/__tests__
```

**Result:** 139 tests green (2026-07-02).

## Device checklist (founder)

| ID | Check |
|----|-------|
| D7 | Pin, no taps 2s — no lateral drift from water current |
| D8 | RELEASE shows speed ramp; on RELEASE→FLOW `stageIndex` increments and speed snaps to next stage constant |
| D3 | Hard side block — squash, foam burst, small rebound away from wall |

## Deferred to Track 2

- `PassageTimingTier` / `passageTimingEval` gating bounce on failed vs acceptable scrape → see [track2-slice-a-passage-timing-handoff.md](./track2-slice-a-passage-timing-handoff.md)
- Full `PassageSegment` FSM
