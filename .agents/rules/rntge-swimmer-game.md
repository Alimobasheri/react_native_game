---
trigger: model_decision
description: RNTGE game engine and Swimmer ECS architecture — View/System/Component patterns, game vs engine boundaries, and UI-thread global state
---

# RNTGE Game Engine & Swimmer Game

We focus on the **Swimmer game** story (`src/containers/ReactNativeSkiaGameEngine/Swimmer.stories.tsx`) using the **RNTGE** game engine (`src/containers/ReactNativeSkiaGameEngine/RNTGE.tsx`).

## Engine architecture

- **RNTGE** is a 2D game engine with ECS support:
  - ECS core: `src/containers/ReactNativeSkiaGameEngine/services-ecs/ecs.ts`, `system.ts`
  - Systems and data live on the **global object of the UI thread** (`global._RNTGE_`).
- Keep the engine as an **efficient, fully interconnected** 2D React Native game engine.

## Task type: game vs engine

- **Game tasks**: Use the current RNTGE structure correctly. Implement game features (entities, components, systems) following existing patterns. You shouldn't touch `global._RNTGE_` or other global related to game engine, or use any global at all. You shouldn't touch `RNTGE.tsx` or any code it imports as tehy're the game engine core and unchan gable by a game dev.
- **Engine tasks**: Add or fix engine features/bugs without breaking the above architecture. Prefer minimal, targeted changes. In this case you will cahnge `RNTGE.tsx` or any code it imports and works with internally.

## Reference ECS flow (Swimmer)

Canonical example of how entities, components, and systems plug into RNTGE:

| Role | File |
|------|------|
| **View** (an opinionated type of React Component with null return, creates entity + components useAddEntity, registers system using useAddSystem) | `src/components/SwimmerView/SwimmerView-rntge.tsx` |
| **System** (game logic, `requiredComponents`, `requiredEvents`, `process`, systems can be used to dispatch events or process events dispatched too) | `src/systems/PhysicsSystem/SwimmerPhysicsSystem.ts` |
| **Component** (name, data type, values are always held here (no gloablThis), factory) | `src/Game/ecs-components/Swimmer.ts` |

Pattern: View uses `useAddEntity` with component array (game + render + optional touch), `useAddMatterBody` for physics, `useAddSystem` for game systems. Systems use `ecs.getEntitiesWithComponents`, `components[Name].get(entity)`, and `ecs.updateComponent`.

## Mindset

- Act as a **skilled indie game developer** with strong **front-end, TypeScript, and React Native** experience.
- Apply **best practices** for game engines, developer experience, and player experience.
- Treat tasks as **fully complex**: reason about interactions between UI thread, worklets, ECS, and physics.