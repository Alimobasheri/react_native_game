# Swimmer Game Design Overview

This document explains the current game prototype for an LLM or developer who has no prior context. The playable entry point is `Swimmer.stories.tsx`, which builds the game scene using the React Native Skia game engine, ECS components, Matter physics bodies, and several gameplay systems.

## High-Level Pitch

The game is a vertical survival swimmer / floater game inside a cave-like container.

The player controls a small floating character on a water surface. Obstacle rows descend from above, creating the illusion that the player is being carried upward through a dangerous vertical shaft. The player taps left or right to steer horizontally, trying to stay inside safe water channels between blocks. If the swimmer is pinned under a solid obstacle while underwater and pushed off-screen, the run ends.

The core fantasy is:

> A controllable floater rides a rising / pressurized water flow through a vertical cave. The water is both the force that carries the player forward and the danger that crushes or traps them if they fail to steer through the openings.

## Core Loop

1. The swimmer floats near the water surface.
2. Rows of block obstacles move downward toward the swimmer.
3. Each row contains blocked columns and open columns.
4. Open columns form the playable path.
5. The player taps left or right to align with the path before each row reaches the water surface.
6. Water flow and current can push the swimmer horizontally depending on the active gap shape.
7. Score increases over time based on water / obstacle speed.
8. The run ends when the swimmer is trapped by an obstacle while underwater and falls below the visible screen.

## Runtime Scene Setup

`Swimmer.stories.tsx` creates the Storybook playable scene:

- Full-screen cave background.
- A centered vertical container, width = `80%` of screen width, height = full screen height.
- A water entity rendered with the custom Skia water shader.
- A swimmer entity with a Matter body.
- An obstacle manager entity.
- A full-screen tap overlay.
- A score text entity.
- A game-over scene.

Important scene files:

- `src/containers/ReactNativeSkiaGameEngine/Swimmer.stories.tsx`
- `src/components/ContainerView/ContainerView-rntge.tsx`
- `src/components/WaterView/WaterView-rntge.tsx`
- `src/components/SwimmerView/SwimmerView-rntge.tsx`
- `src/components/TapSwimmer/TapSwimmer-rntge.tsx`
- `src/components/ObstacleView/ObstacleView-rntge.tsx`
- `src/components/ScoreView/ScoreView-rntge.tsx`

## Coordinate and Grid Model

The obstacle field is column-based.

- The container width is divided into `LAYOUT_CONSTANTS.COLUMNS`.
- Each obstacle block is one column wide and one row tall.
- A row is represented by:
  - `blocks`: solid columns with obstacle bodies.
  - `gaps`: open columns with no solid obstacle.
- Rows are generated above the water and move downward.
- Row `0` in a template is the lower / first row of that template segment; later rows are placed above it.

Conceptually:

```text
columns: 0 1 2 3 4 5 6 7 8 9 ...

row:
  block block gap gap gap block block ...

playable path:
  the connected sequence of gap columns across consecutive rows
```

## Player Control

The current Storybook game uses tap control:

- Tap left half of screen: steer left.
- Tap right half of screen: steer right.
- Rapid same-direction taps increase a temporary tap multiplier.
- The physics system consumes each tap as a one-frame impulse, then applies drag.
- Horizontal movement is clamped inside the container.
- At higher water speeds, drag increases and precision becomes harder.

Relevant files:

- `TapSwimmer-rntge.tsx`
- `SwimmerPhysicsSystem.ts`

There is also a pan-control path in `SwimmerView`, but the current story passes `useColumnControl={true}`, so the prototype is tap-driven.

## Swimmer Physics

The swimmer is a Matter rectangle body, but most gameplay motion is manually driven by `SwimmerPhysicsSystem`.

The swimmer:

- Has horizontal velocity from taps and water current.
- Tilts visually based on horizontal speed.
- Bobs gently near the water surface.
- Receives buoyancy when underwater.
- Settles back downward if above the water surface.
- Follows the same calculated surface curve used by the water shader when it is inside a valid gap.

The swimmer does not freely simulate as a normal physics object. The system explicitly sets position, angle, and velocity each frame to keep the game arcade-like and predictable.

## Water as Gameplay

Water is not only visual. It drives difficulty and steering pressure.

`WaterPhysicsSystem`:

- Ramps base speed over time.
- Updates `water.raisingSpeed`, which also controls obstacle movement and score gain.
- Looks at the currently active obstacle row and previous row.
- Converts row gaps into normalized gap ranges.
- Tracks up to four simultaneous gap ranges.
- Computes water flow direction per range.
- Computes surge energy, pressure, curve amplitude, curve center, and gap blend.

The water shader then uses these values to draw:

- A curved surface near the active gaps.
- Flow streaks.
- Bubbles.
- Stronger visual pressure where gaps narrow or shift.

This means level geometry affects both collision and water behavior.

## Obstacle Rows and Path Generation

The obstacle system owns row generation, movement, and cleanup.

Relevant file:

- `src/systems/PhysicsSystem/ObstacleSystem.ts`

Each frame:

1. Existing rows move downward by `waterData.raisingSpeed * deltaSeconds`.
2. Rows below the container are removed.
3. The row nearest the water transition band becomes the active row for water physics.
4. New rows spawn above the screen when needed.

Rows are generated by `RowPathTemplate` objects:

```ts
interface RowPathTemplate {
  createCtx?: () => TemplateCtx;
  init?: (ctx: TemplateCtx, args: TemplateInitArgs) => void;
  getRowCount: (ctx: TemplateCtx) => number;
  getRow: (ctx: TemplateCtx, args: GetRowArgs) => Entity;
}
```

The template contract is simple:

- Given `prevRow`, row index, grid dimensions, and spawn parameters, produce one obstacle row entity.
- The row entity stores `gaps`, spawned obstacle entities, and a pointer to the previous row.

## Procedural Path Modes

### Base Single-Path Generator

The simple `base` template uses `generateGaps`.

It starts near the center and then drifts left or right. Each next row keeps a small cluster of neighboring gaps around the previous gap edge.

This creates one continuous tunnel but can become repetitive.

### Base Multi-Path Generator

The stronger procedural generator is `baseMulti`, implemented by `generateMultiPathGaps`.

It works with gap ranges instead of only individual columns.

Core rules:

- Start with one or sometimes two central-ish gap ranges.
- Keep gap ranges at least `MIN_W = 2` columns wide.
- Mutate each range slightly by shifting or widening / narrowing.
- Ensure every current range overlaps some previous range by at least one column.
- Occasionally split a wide range into two paths.
- Allow up to four simultaneous paths.
- Clamp overly wide paths so the row does not become trivial.

The most important playability invariant is:

> Every generated gap range must connect back to a previous gap range, so the path does not teleport to an unreachable location.

This is what makes `baseMulti` suitable for endless procedural play.

## JSON Shape Templates

Hand-authored templates are JSON strings consumed by `createJsonLevelRowPathTemplate`.

Template schema:

```ts
type JsonLevelRow = {
  blocks: number[];
  gaps?: number[];
};

type JsonLevel = {
  columns: number;
  rows: JsonLevelRow[];
};
```

If `gaps` is omitted, it is derived as every column not listed in `blocks`.

Current shape templates include:

- `smily`
- `jellyfish`
- `micky`
- `kitty`
- `deadpool`
- `megaman`

These templates can create recognizable block silhouettes such as faces or characters. They are visually strong, but they are hand-authored and do not automatically guarantee the same playability invariants as `baseMulti` unless the rows are drawn carefully.

## Template Switching and Rest Segments

`ObstacleSystem` stores active template state in `ObstaclesManager.templateInfo`.

When a template finishes its row count:

- The system can switch to another mapped template.
- A `rest` template can be inserted between denser templates.
- `rest` creates mostly side-wall blocks, leaving the middle open.

This gives the game a rough rhythm:

```text
shape / challenge segment -> rest / breathing segment -> next segment
```

The currently available mapping is in `MappedTemplates` in `ObstacleSystem.ts`.

## Hybrid Template Idea

The project has explored a hybrid concept in `template-preview.html`:

- JSON template defines the visual silhouette.
- `baseMulti` defines the playable gap path.
- If JSON wants a block where procedural generation wants a gap, that cell is considered a conflict.

Design interpretation:

- Solid orange blocks remain lethal / blocking.
- Procedural gaps remain playable and connected.
- Conflict cells can be previewed as non-blocking green coin pickups.

This hybrid idea is useful because it lets the template keep its visual face / character shape while the procedural generator preserves a fair path. In runtime game code, this would require a separate entity type or collision category for collectibles; it should not be treated as a normal static obstacle body.

## Collision and Failure

Obstacle blocks are static Matter rectangles.

The swimmer is blocked by:

- Matter collision pairs with obstacle bodies.
- A manual "blocked from above" check that looks for an obstacle overlapping horizontally above the swimmer.

Game over is dispatched when all of these are true:

- Game over is not disabled.
- The swimmer is blocked from above.
- The swimmer is underwater.
- The swimmer has moved below the visible screen.
- Game over has not already been dispatched.

In practical terms:

> The player loses when they fail to clear the path, get pinned under a solid block, and the water / scrolling pressure drags them down and out of the screen.

## Scoring

`ScoreSystem` increments score after the initial phase based on water speed and time.

Current formula:

```text
score += (raisingSpeed * elapsedSeconds) / SCORE_DIVISOR
```

The score is therefore a distance / survival score. Faster water increases score faster, but also raises difficulty.

## What Makes a Row Playable

A row or sequence is playable when:

1. There is at least one gap wide enough for the swimmer.
2. The gap overlaps enough with the previous row's gap so the player can reach it.
3. The movement speed, current, and tap impulse allow the swimmer to reposition before the row reaches the water surface.
4. The visual water surface and obstacle silhouettes clearly communicate where the safe path is.

For procedural rows, `baseMulti` enforces much of this automatically.

For JSON templates, the designer must ensure it manually unless the template is hybridized with procedural gap generation.

## Design Pillars

1. **Readable one-touch control**  
   Tap left or right. Movement should feel immediate but slightly floaty.

2. **Water as both helper and threat**  
   Water carries the player, shapes the surface, pushes sideways, and creates pressure.

3. **Path anticipation**  
   The player should read upcoming gaps and pre-position before the row reaches the swimmer.

4. **Connected procedural challenge**  
   Paths should mutate, split, merge, and narrow without becoming impossible.

5. **Occasional visual set-pieces**  
   Face / character templates can provide memorable screenshots and variety, but should not break path fairness.

6. **Short-session survival scoring**  
   Score should reward staying alive longer and handling faster water.

## Mental Model for Future LLMs

Think of the game as an endless vertical lane-survival game, not a free-form platformer.

The actual gameplay state is mostly determined by:

- The current obstacle row's `gaps`.
- The previous row's `gaps`.
- The swimmer's horizontal position.
- The water speed and flow values derived from gap movement.
- Whether the swimmer is pinned under a solid obstacle.

If you modify levels or generation, preserve the key invariant:

> Safe paths must remain horizontally reachable from row to row.

If you modify visuals, preserve the key readability rule:

> The player must instantly know which cells are solid hazards, which cells are passable water, and which cells are optional collectibles.

