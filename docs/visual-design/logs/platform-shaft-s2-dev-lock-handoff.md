# Platform Shaft Slice 2 — Dev Lock Props Handoff

**Date:** 2026-07-04  
**Roadmap:** [platform-shaft-roadmap.md](../../game-design/platform-shaft-roadmap.md) §9 Slice 2

## Before → after (player eyes)

| Moment | Before | After |
|--------|--------|-------|
| **Device test** | No way to lock press intro shaft from App | App.tsx passes shaft lock props; stored on ECS manager |
| **Storybook** | Only multipath segment locks (funnel, pinball, …) | **`LockedPressIntroShaftLoop`** story + shaft controls |
| **In-game look** | Unchanged — still `directed` multipath | Unchanged until **Slice 3** streams intro shaft rows |

## Shipped modules

| Module | Role |
|--------|------|
| `src/Game/ecs-systems/obstacleSystem.ts` | `StoryLockedShaftRecipe` union (`composePressIntroShaft`) |
| `src/Game/ecs-components/ObstaclesManager.ts` | `storyLockedShaftRecipe`, seed, difficulty, loop |
| `src/components/ObstacleView/ObstacleView-rntge.tsx` | Props → manager at entity spawn |
| `src/containers/ReactNativeSkiaGameEngine/Swimmer.stories.tsx` | Args, controls, `LockedPressIntroShaftLoop` |
| `App.tsx` | Device entry with shaft lock props enabled |

## Dev lock props (roadmap §7)

| Prop | Type | App default |
|------|------|-------------|
| `storyLockedShaftRecipe` | `'composePressIntroShaft'` | set |
| `storyLockedShaftSeed` | `number` | `42` |
| `storyLockedShaftDifficulty` | `0..1` | `0.4` |
| `storyLockShaftLoop` | `boolean` | `true` |

## Visual test recipe (Slice 2)

1. Reload App on device — game runs as before (directed multipath).
2. Storybook → **LockedPressIntroShaftLoop** — controls show shaft props.
3. Confirm no crash; props live on `ObstaclesManager` for Slice 3.

**Slice 3 visual pass:** intro shaft rows + 1-col squeeze + steel slab overlay.

## Not done (Slice 3)

| ID | Task | File |
|----|------|------|
| S3.1 | `platformShaftTuning.ts` parity | already partial |
| S3.2 | Engine `composePressIntroShaft` | `src/Game/path/platformShaft/` |
| S3.3 | ObstacleSystem reads shaft lock | `ObstacleSystem.ts` |
| S3.4 | Machinery render stub | render layers |

## Future prompt

```text
Read docs/visual-design/logs/platform-shaft-s2-dev-lock-handoff.md and platform-shaft-roadmap.md §9 Slice 3.

Task: Implement Slice 3 — engine composePressIntroShaft + ObstacleSystem streaming + steel render stub.

Done already:
- StoryLockedShaftRecipe + ObstaclesManager props (Slice 2)
- Lab composePressIntroShaft + harmonizer (Slice 1.5)
- App.tsx + LockedPressIntroShaftLoop story wired

Implement:
1. Port composePressIntroShaft to src/Game/path/platformShaft/ (worklet-safe)
2. platformShaftIntro RowPathTemplate in ObstacleSystem
3. readStoryLockedShaftRecipe helpers; override template when recipe set
4. Steel machinery render stub on slab rows
5. storyLockShaftLoop segment repeat on rollover

Visual pass: safe runway → 5 slabs → release; 1-col squeeze at narrowest; loop on restart.
```
