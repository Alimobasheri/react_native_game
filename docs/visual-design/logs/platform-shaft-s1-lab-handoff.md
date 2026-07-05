# Platform Shaft Slice 1 — Lab Harmonizer + pressTeachSingle Handoff

**Date:** 2026-07-04  
**Roadmap:** [platform-shaft-roadmap.md](../../game-design/platform-shaft-roadmap.md) §9 Slice 1

## Before → after (player eyes)

| Moment | Before | After |
|--------|--------|-------|
| **Design a teach beat** | Manual slab drag only | **Insert press teach** → 12-row FLOW strip in one click |
| **Narrowest squeeze** | Handoff JSON could hit 0 overlap (rows 22–23) | Harmonizer caps `pressCols`; **1 col** remains at full press |
| **Fairness bar** | Generic timed overlap message | Platform hint: min residual 1 col (PS-003) |
| **Engine parity** | No TS harmonizer | `harmonizer.ts` mirrors lab math; 6 tests pass |

## Shipped modules

| Module | Role |
|--------|------|
| `scripts/stage-design-lab/hazard-generators.js` | `capPressCols`, `harmonizePlatformBeat`, `pressTeachSingle`, preset rename |
| `scripts/stage-design-lab/fairness-v2.js` | Platform press cap audit + timed-fail hint |
| `scripts/stage-design-lab/composer.js` | `insertPressTeach`, harmonizer warnings on `doc.meta` |
| `scripts/stage-design-lab/app.js` + `template-preview.html` | **Insert press teach** button |
| `src/config/platformShaftTuning.ts` | `MIN_RESIDUAL_GAP_COLS: 1`, teach defaults |
| `src/Game/path/platformShaft/harmonizer.ts` | Engine harmonizer (worklet-safe) |
| `src/Game/path/platformShaft/types.ts` | Corridor / slab types |
| `src/Game/path/platformShaft/__tests__/harmonizer.test.ts` | 6-col cap tests |

## Locked numbers

| Key | Value |
|-----|-------|
| `MIN_RESIDUAL_GAP_COLS` | **1** |
| Teach corridor gap width | **2 cols** (`[2,3]` on 6-col) |
| Teach `pressCols` (capped) | **1** |
| Teach segment rows | **12** (5 approach + 3 slab + 4 recovery) |
| `widePreset` / `narrowPreset` | Replaces `6of8` / `2of8` labels (aliases kept) |

## Headless verify (2026-07-04)

```text
pressTeachSingle(6 cols) → fairnessReport.ok: true, minEffectiveGapCols: 1, pressCols: 1
```

## Visual test recipe

1. Open [template-preview.html](../../../template-preview.html) (stage-design-lab)
2. Stage sidebar → **Insert press teach**
3. Scrub playback at slab rows — gap narrows to **one blue column**
4. Export → Handoff bundle — `fairnessReport.ok === true`

## Tests

```bash
npm test -- --watchAll=false src/Game/path/platformShaft/__tests__/harmonizer.test.ts
```

## Not done (Slice 2)

| ID | Task | File |
|----|------|------|
| S2.1 | `StoryLockedShaftRecipe` type | `obstacleSystem.ts` |
| S2.2 | ObstaclesManager shaft lock props | `ObstaclesManager.ts` |
| S2.3 | `LockedPressTeachSingleLoop` story | `Swimmer.stories.tsx` |
| S2.4 | App.tsx pass-through | `App.tsx` |

## Key paths

- `scripts/stage-design-lab/hazard-generators.js`
- `src/Game/path/platformShaft/harmonizer.ts`
- `src/config/platformShaftTuning.ts`
- `docs/game-design/platform-shaft-roadmap.md` §9 Slice 2

## Future prompt

```text
Read docs/visual-design/logs/platform-shaft-s1-lab-handoff.md and platform-shaft-roadmap.md §9 Slice 2.

Task: Implement Slice 2 — dev visual lock props (Storybook + App.tsx).

Done already:
- pressTeachSingle in lab with harmonizer + fairness ok
- harmonizer.ts + tests on 6-col grid

Implement:
1. StoryLockedShaftRecipe union in obstacleSystem.ts
2. ObstaclesManager props: storyLockedShaftRecipe, seed, difficulty, loop
3. LockedPressTeachSingleLoop story (mirror LockedPathFunnelLoop)
4. App.tsx pass-through for device loop

Visual pass: storyLockShaftLoop=true, one tall slab, 1-col squeeze, survivable steer.

Start with a short plan. Do not wire ObstacleSystem streaming yet (Slice 3).
```

---

## Slice 1.5 addendum (2026-07-04)

**Problem:** One-slab `pressTeachSingle` is a harmonizer atom, not a teach chapter.

**Shipped:** `composePressIntroShaft` — ~34 rows, **5 slabs** (safe runway → press 1 R→L → breathe → press 2 L→R → chicane → stack tease ×2 → climax → release).

| Check | Result |
|-------|--------|
| Lab button | **Insert press intro shaft** |
| Headless | `rows: 34`, `hazards: 5`, `fairnessReport.ok`, `minGap: 1` |
| Atom preserved | `pressTeachSingle` unchanged for tests |

**Visual test:** Same lab URL → **Insert press intro shaft** → scrub full arc → export bundle.

**Slice 2 note:** Dev lock story should loop `composePressIntroShaft`, not `pressTeachSingle`.
