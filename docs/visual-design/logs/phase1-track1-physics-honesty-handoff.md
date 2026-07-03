# Track 1 — Physics Honesty Handoff

**Date:** 2026-07-02  
**Roadmap:** [passage-timing-roadmap.md](../game-design/passage-timing-roadmap.md) §9 Track 1

## Before → after (player eyes)

| Moment | Before | After |
|--------|--------|-------|
| **Pin under ceiling, no taps** | Water current slowly slides swimmer sideways out of pin column | Lateral advection off; body bleeds residual vx via damping, then stuck until TAP |
| **FLOW chapter** | Speed creeps up every second (`WATER_SPEED_ACCELERATION`) | Flat **200 px/s** hold for whole FLOW phase |
| **FLOW → TENSION** | Gradual unnoticed accel | One snap to **230 px/s** at phase row boundary |
| **Hard side block** | Bounce config lived in `skillFeedback` shift_commit (broken / wrong layer) | Physics-owned bounce: kill vx, small rebound, squash + foam from `bounceDisruptorTuning` |

## Tuning keys (device pass)

| Concern | File |
|---------|------|
| Macro speed tiers S1–S3 | `src/config/passageTiming.ts` → `speedTiers` |
| Pin lateral block | `src/config/swimmerTuning.ts` → `PINNED_BLOCK_WATER_CURRENT_ADVECTION` |
| Bounce disruptor | `src/config/swimmerTuning.ts` → `bounceDisruptorTuning` |
| Deprecated continuous accel | `waterPhysicsTuning.WATER_SPEED_ACCELERATION_PER_SECOND` (unused) |

## Systems touched

- `SpeedTierSystem` — snaps `raisingSpeed` / `baseSpeed` on `pacingPhaseAtTotalRows` change
- `WaterPhysicsSystem` — gap/flow/calmness only; no per-frame speed lerp
- `SwimmerPhysicsSystem` — pin advection gate + bounce disruptor
- Diag: `skillFeedbackDiag` live fields `pacingPhase`, `speedTierLabel`, `baseSpeed`

## Tests

```bash
npm test -- --watchAll=false \
  src/Game/characters/__tests__/swimmerPinnedWaterCurrent.test.ts \
  src/Game/characters/__tests__/swimmerBounceDisruptor.test.ts \
  src/systems/PhysicsSystem/__tests__/speedTier.test.ts \
  src/Game/feedback/__tests__
```

**Result:** 139 tests green (2026-07-02).

## Device checklist (founder)

| ID | Check |
|----|-------|
| D7 | Pin, no taps 2s — no lateral drift from water current |
| D8 | Diag `pacingPhase` TENSION — `raisingSpeed` 230; FLOW 30s flat |
| D3 | Hard side block — squash, foam burst, small rebound away from wall |

## Deferred to Track 2

- `PassageTimingTier` / `passageTimingEval` gating bounce on failed vs acceptable scrape
- Full `PassageSegment` FSM
