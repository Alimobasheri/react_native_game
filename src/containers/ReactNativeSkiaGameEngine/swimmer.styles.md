# Flood Rush / Rising Rush — Visual Style & Implementation Bible

## 0. Purpose of This Document

This document defines the complete visual, UI, animation, and shader direction for a 2D hyper-casual mobile game about a goofy rectangular creature being pushed upward by violently rising water inside underground channels.

The goal is to make every screen, shader, icon, animation, and UI element feel like it belongs to one unified game.

The game must feel:

- readable in under 1 second
- polished but simple enough for a small team
- hyper-casual, juicy, colorful, and replayable
- feasible in a 2D engine
- consistent across gameplay, start screen, game over, shop/meta, and animations

The visual references show the target quality level. This document explains how to recreate that quality with reusable systems.

---

# 1. Core Game Fantasy

The player controls a stupid, funny, non-human rectangular character floating on the surface of rising water.

The water is pushing the character upward through underground channels. The player swims left or right across the water surface to avoid orange block obstacles. If the character is pinned by blocks and gets pushed off-screen, the player loses.

Core fantasy:

> “A tiny goofy block creature is being launched upward by a crazy underground flood and must swim left/right to survive.”

The game is not realistic. It is not dark horror. It is a colorful arcade survival ride.

---

# 2. Final Art Direction

## Style Name

**Chunky Underground Aqua Rush**

## Visual Keywords

- chunky
- bubbly
- juicy
- toy-like
- rounded
- readable
- saturated
- goofy
- soft 2D
- arcade polish
- underground cave
- bright water
- orange clay blocks

## Do Not Use

- realistic sewer visuals
- horror lighting
- overly detailed rocks
- complex 3D environments
- tiny UI
- dark water
- thin typography
- realistic human swimmer
- cluttered mobile menus
- too many currencies or popups

## Implementation Style

The game should look high quality but be simple to build.

Use:

- 2D sprites
- layered parallax backgrounds
- simple particle systems
- SKSL water shader
- sprite-based foam overlays
- sprite-based bubbles
- simple UI components
- reusable animation states

Avoid:

- complex physics water
- expensive simulations
- fully dynamic fluid rendering
- complex skeletal characters
- complicated lighting systems

---

# 3. Core Visual Hierarchy

During gameplay, the player must instantly understand four things:

1. **Blue/aqua water = rising force**
2. **Green rectangular character = player**
3. **Orange blocks = danger**
4. **Open gaps = survival path**

The game screen must prioritize:

1. player character
2. incoming obstacle gaps
3. water surface
4. score/height
5. background atmosphere

The background must never compete with the gameplay objects.

---

# 4. Color Palette

## Primary Palette

### Water

Use bright aqua/cyan water. It must feel clean, energetic, and magical.

Recommended colors:

```text
Water Base:        #10C8E8
Water Mid:         #17A9E8
Water Deep:        #087CC8
Water Highlight:   #9EF7FF
Foam White:        #F2FFFF
Bubble Highlight:  #D7FCFF
```

### Character

The main character should be bright green so it separates from both orange blocks and blue water.

```text
Character Main:       #35E63E
Character Shadow:     #18A72E
Character Highlight:  #A9FF7A
Character Mouth:      #271222
Character Tongue:     #FF4F58
Eyes:                 #FFFFFF
Pupils:               #101020
```

### Blocks

Blocks should be warm orange/yellow clay. They are the main danger object.

```text
Block Top:        #FFA93A
Block Mid:        #F47A22
Block Shadow:     #B94417
Block Edge Dark:  #7A2B14
Block Highlight:  #FFD46B
```

### Cave Background

The cave background should be dark purple, giving strong contrast against orange blocks and aqua water.

```text
Cave Deep:       #211337
Cave Mid:        #3C2054
Cave Rock:       #5A2B5F
Cave Rock Light: #7A3E68
Cave Shadow:     #120B22
```

### UI Colors

```text
Primary CTA Green:   #63E326
CTA Green Shadow:    #238C19
Secondary Blue:      #18BFF2
Panel Purple:        #2E1A56
Panel Border:        #6E55A6
Warning Red:         #FF3D37
Reward Yellow:       #FFD43B
White Text:          #FFFFFF
Soft Text:           #C9B7FF
Dark Text:           #25163D
```

---

# 5. Background System

## Gameplay Background Structure

The background is built from simple layers:

1. **Far cave gradient**
2. **Soft abstract cave shapes**
3. **Side rock walls**
4. **Small plant/rock details**
5. **Foreground block obstacles**
6. **Water layer**
7. **Foam and bubbles**
8. **Character**
9. **UI**

## Far Background

Use a vertical dark purple gradient.

Top can be slightly darker. Mid can have subtle soft cave silhouettes.

Do not make the background noisy. It must stay calm so gameplay remains readable.

## Side Walls

Side walls should be simple rounded purple rocks.

Rules:

- use large rock chunks, not many small stones
- low-detail
- soft highlights on inner edge
- darker outer edge
- occasional tiny green plants
- avoid visual clutter near the character

## Parallax

Use simple parallax:

```text
Far cave layer:     moves slowly
Side wall layer:    moves medium
Obstacle blocks:    gameplay speed
Water streaks:      upward speed illusion
Bubbles:            upward motion
```

Because the game scrolls vertically upward, the world should appear to move downward.

---

# 6. Obstacle Block System

## Shape

Blocks are rounded square clay blocks.

They should be easy to tile into vertical obstacle patterns.

Recommended block size:

```text
Base unit: square tile
Rounded corners: 15–22% of tile width
Edge bevel: 4–8 px on a 128 px sprite
```

## Block Sprite Rules

Each block should include:

- warm orange base
- top-left highlight
- darker bottom edge
- tiny holes/dimples
- soft inner shadow
- slight outer shadow

## Variations

Create 3–5 block variants:

1. normal block
2. slightly cracked block
3. darker block
4. chipped corner block
5. warning/danger edge block

Use random variants sparingly. Too much variation reduces readability.

## Obstacle Patterns

Since this is an infinite runner, obstacle patterns should be clear silhouettes.

Good patterns:

```text
single column
two-column gate
L-shape
reverse L-shape
T-shape
staggered blocks
narrow channel
wide recovery gap
pinch tunnel
```

Bad patterns:

```text
random noisy block fields
unreadable mazes
tiny gaps
obstacles hidden behind foam
same-width corridors forever
```

## Gameplay Readability Rule

The player must always see at least one possible path before reaching danger.

If the character dies, the player should feel:

> “I reacted late.”

Not:

> “I couldn’t see what happened.”

---

# 7. Player Character Design

## Character Concept

The character is a stupid rectangular non-human creature.

It should be:

- simple
- funny
- readable
- iconic
- easily skinnable
- easy to animate

Base character:

```text
Shape: rounded rectangle / square block
Color: bright green
Face: large round eyes, silly mouth
Arms: tiny side paddles/fins
Body movement: rotates and tilts while swimming
```

## Character Silhouette

The silhouette must remain consistent across skins.

Do not turn skins into completely different body shapes. The rectangle must always remain clear.

## Base Character States

### Idle Float

- character sits on water surface
- slight vertical bob
- tiny side arms relaxed
- happy face
- small bubbles nearby

### Swim Left

- character tilts left
- arms paddle
- water streak trails to the right
- eyes look toward movement direction
- slight squash/stretch

### Swim Right

- character tilts right
- arms paddle
- water streak trails to the left
- eyes look toward movement direction

### Fast Swim

- character rotates more
- face becomes worried or excited
- stronger water trail
- small foam burst behind
- speed lines appear

### Panic

- wide eyes
- open mouth
- sweat drops
- tiny shake
- arms raised

### Pinned / Squashed

- character compressed between blocks or screen edge
- dizzy eyes or X-eyes
- tongue out
- foam splash
- small stars above head

### Revive

- character pops out of water
- circular splash
- blink
- happy reset expression

### Victory / New Best

- arms up
- sparkle stars
- big smile
- character bounces on water

---

# 8. Character Animation Implementation

## Animation Style

Use simple transform animation, not complex rigging.

Animate:

- position
- rotation
- scale
- facial sprite swap
- arm/flipper sprite rotation
- small particle bursts

## Recommended Timings

```text
Idle bob:          1.0s loop
Swim tilt:         0.12s in / 0.18s settle
Direction change:  0.10s squash + splash
Panic shake:       0.06s repeated jitter
Pinned squash:     0.18s impact
Revive pop:        0.45s splash + rise
Game over dizzy:   0.6s loop
```

## Movement Rotation

The character should rotate based on horizontal velocity.

Example:

```text
horizontalSpeed = playerVelocityX
rotation = clamp(horizontalSpeed * -0.08, -18deg, 18deg)
```

When moving fast left, the rectangle tilts left. When moving fast right, it tilts right.

## Squash and Stretch

Use very small squash/stretch.

```text
Idle scale:        1.00, 1.00
Fast swim scale:   1.05, 0.95
Pinned scale:      1.18, 0.72
Revive pop scale:  0.80 → 1.15 → 1.00
```

Do not overdo it. The character should stay readable.

---

# 9. Water Visual System

The water is the most important visual system.

The water must communicate:

- rising force
- surface position
- speed
- danger
- player support
- movement energy

The water should be built from multiple simple layers.

## Water Layer Stack

From back to front:

```text
1. Deep water fill
2. Vertical current streaks
3. Bubble layer
4. Surface wave shader
5. Foam cap
6. Character wake foam
7. Splash particles
8. Danger tint overlay, when needed
```

## Layer 1: Deep Water Fill

A rectangle or mesh filling from bottom to the current water height.

Use a blue/cyan vertical gradient.

Bottom should be darker. Top should be brighter.

## Layer 2: Vertical Current Streaks

Use shader-generated vertical streaks or tiled transparent sprites.

Streaks should move upward faster as water speed increases.

They create the illusion of violent upward pressure.

## Layer 3: Bubbles

Use particles or shader circles.

Bubble rules:

- spawn inside water
- move upward
- vary size
- fade in/out
- larger bubbles when speed is high
- small bubble clusters near character

Bubble density should scale with water speed.

## Layer 4: Surface Wave

This is the top water edge. It must be very readable.

Use an animated wavy top edge, either through SKSL or a separate sprite mask.

The surface should:

- wobble horizontally
- react to character x-position
- have white foam along the top
- rise with water height

## Layer 5: Foam Cap

Foam is the white bubbly line on the water surface.

It should be simple and sprite-friendly:

- white base
- cyan shadow
- round bubble blobs
- uneven wavy edge
- small foam clusters at side walls

## Layer 6: Character Wake

When character swims left/right, create a small trailing wake.

Wake should be:

- white/cyan
- short-lived
- directional
- stronger at high horizontal speed

## Layer 7: Splash Particles

Spawn splashes when:

- direction changes quickly
- near collision
- revive occurs
- game over occurs
- speed increases

Particle types:

```text
small white droplets
blue droplets
foam puffs
bubble rings
short streak lines
```

## Layer 8: Danger Tint

When the character is near being pinned:

- red vignette at screen edges
- red foam tint near water top
- warning exclamation icons near pinch zones
- subtle shake

Do not make the screen too red. It should warn, not hide gameplay.

---

# 10. SKSL Water Shader Direction

## Goal

Use SKSL to create the animated water body and surface.

The shader does not need true fluid simulation. It should fake water using:

- vertical gradients
- animated sine waves
- layered noise
- moving streaks
- bubbles
- foam line
- speed-controlled distortion

## Required Uniforms

The shader should expose these uniforms:

```glsl
uniform float2 uResolution;
uniform float uTime;
uniform float uWaterLevel;     // 0 to 1, normalized screen height
uniform float uSpeed;          // 0 to 1 or higher for intense states
uniform float uPlayerX;        // normalized 0 to 1
uniform float uPlayerVelocity; // negative left, positive right
uniform float uDanger;         // 0 to 1
uniform float uFoamAmount;     // 0 to 1
```

Optional:

```glsl
uniform float uSeed;
uniform float uBubbleDensity;
uniform float uSurfaceAmplitude;
uniform float uCurrentIntensity;
```

## Water Shader Responsibilities

The shader should render:

1. water fill below `uWaterLevel`
2. animated water gradient
3. vertical current streaks
4. bubble-like circles
5. top surface wave
6. foam highlight near the surface
7. red danger tint when needed

## Water Surface Formula

Use a combination of sine waves:

```glsl
surfaceY =
    uWaterLevel
    + sin(x * 12.0 + uTime * 2.2) * smallAmplitude
    + sin(x * 28.0 - uTime * 3.5) * smallerAmplitude
    + playerWakeInfluence
```

The surface amplitude should increase with speed.

```glsl
amplitude = mix(0.006, 0.022, clamp(uSpeed, 0.0, 1.0));
```

## Player Wake Influence

The water surface should bulge slightly around the player.

```glsl
float distToPlayer = abs(x - uPlayerX);
float wake = exp(-distToPlayer * 18.0) * 0.012;
wake *= clamp(abs(uPlayerVelocity), 0.0, 1.0);
```

Add wake to the surface height and foam intensity.

## Vertical Streaks

Use repeated vertical noise or sine patterns.

Visual purpose:

- show upward speed
- make water feel powerful
- add polish without simulation

Streak intensity increases with `uSpeed`.

## Foam

Foam should appear around the water surface.

Foam is strongest where:

- pixel is close to surface
- speed is high
- near player wake
- near walls

Use a band around the surface:

```glsl
foamBand = smoothstep(foamWidth, 0.0, abs(y - surfaceY));
```

Foam color:

```text
white with cyan shadow
```

## Danger Mode

When `uDanger` increases:

- add subtle red tint above water
- add warmer foam highlights
- darken edges slightly
- do not hide character or blocks

## Pseudo SKSL Shader

This is a reference shader structure, not final engine-ready code. Adapt names and syntax to the renderer.

```glsl
uniform float2 uResolution;
uniform float uTime;
uniform float uWaterLevel;
uniform float uSpeed;
uniform float uPlayerX;
uniform float uPlayerVelocity;
uniform float uDanger;
uniform float uFoamAmount;

float hash(float2 p) {
    return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    float a = hash(i);
    float b = hash(i + float2(1.0, 0.0));
    float c = hash(i + float2(0.0, 1.0));
    float d = hash(i + float2(1.0, 1.0));
    float2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / uResolution;

    // Convert so y=0 bottom, y=1 top if needed.
    float x = uv.x;
    float y = 1.0 - uv.y;

    float speed01 = clamp(uSpeed, 0.0, 1.0);

    // Surface motion
    float amp = mix(0.006, 0.024, speed01);
    float surface =
        uWaterLevel
        + sin(x * 12.0 + uTime * 2.2) * amp
        + sin(x * 29.0 - uTime * 3.6) * amp * 0.45;

    // Player wake
    float distPlayer = abs(x - uPlayerX);
    float wake = exp(-distPlayer * 18.0) * 0.018 * clamp(abs(uPlayerVelocity), 0.0, 1.0);
    surface += wake;

    // Water mask
    float waterMask = step(y, surface);

    // Base gradient
    float depth = clamp((surface - y) / max(surface, 0.001), 0.0, 1.0);

    float3 deepColor = float3(0.02, 0.35, 0.78);
    float3 midColor  = float3(0.02, 0.75, 0.92);
    float3 topColor  = float3(0.60, 0.98, 1.00);

    float3 waterColor = mix(deepColor, midColor, depth);
    waterColor = mix(waterColor, topColor, smoothstep(0.0, 0.18, 1.0 - depth));

    // Vertical current streaks
    float streakNoise = noise(float2(x * 38.0, y * 6.0 - uTime * (2.0 + uSpeed * 5.0)));
    float streaks = smoothstep(0.72, 0.95, streakNoise);
    streaks *= smoothstep(0.1, 1.0, depth);
    waterColor += streaks * float3(0.10, 0.45, 0.55) * (0.35 + speed01 * 0.65);

    // Bubble dots, fake procedural
    float2 bubbleGrid = float2(x * 18.0, y * 30.0 + uTime * (1.5 + uSpeed * 3.0));
    float2 cell = floor(bubbleGrid);
    float2 local = fract(bubbleGrid) - 0.5;
    float rnd = hash(cell);
    float bubbleSize = mix(0.07, 0.20, hash(cell + 4.2));
    float bubble = smoothstep(bubbleSize, bubbleSize * 0.55, length(local));
    bubble *= step(0.78 - speed01 * 0.25, rnd);
    waterColor = mix(waterColor, float3(0.85, 1.0, 1.0), bubble * 0.55);

    // Foam band around surface
    float foamWidth = mix(0.010, 0.032, speed01) * uFoamAmount;
    float foamBand = smoothstep(foamWidth, 0.0, abs(y - surface));
    float foamNoise = noise(float2(x * 45.0 + uTime * 0.8, y * 20.0));
    foamBand *= smoothstep(0.25, 0.75, foamNoise);
    foamBand += exp(-distPlayer * 24.0) * 0.45 * clamp(abs(uPlayerVelocity), 0.0, 1.0);
    foamBand = clamp(foamBand, 0.0, 1.0);

    waterColor = mix(waterColor, float3(0.95, 1.0, 1.0), foamBand);

    // Danger tint
    float3 dangerColor = float3(1.0, 0.12, 0.08);
    waterColor = mix(waterColor, waterColor + dangerColor * 0.18, uDanger * foamBand);

    return half4(waterColor, waterMask);
}
```

## Important Shader Notes

The shader should not do everything.

Use SKSL for:

- water fill
- wave surface
- streaks
- subtle bubbles
- foam band

Use particles/sprites for:

- big splash bursts
- character wake droplets
- revive explosion
- game over splash
- large bubbles
- warning icons

This split keeps the water high quality but still controllable.

---

# 11. Foam Implementation

Foam is what makes the water look expensive.

Use three foam types:

## 1. Surface Foam

A persistent white bubbly line at the water top.

Implementation options:

- SKSL foam band
- repeated foam sprite strip
- mesh strip with animated UV
- combination of shader + sprites

## 2. Side Foam

Foam along the walls where water touches blocks or cave edges.

Use simple sprite particles or small foam blobs.

## 3. Character Wake Foam

Foam behind the character during left/right movement.

Spawn short-lived foam puffs opposite movement direction.

Example:

```text
If player moves right:
  spawn foam behind left side of character

If player moves left:
  spawn foam behind right side of character
```

Foam particle properties:

```text
lifetime: 0.25s to 0.55s
scale: 0.6 to 1.3
alpha: fade out
movement: slight upward drift
color: white to cyan
```

---

# 12. Speed Effects

Speed effects should be visual, readable, and cheap.

## Calm State

- small bubbles
- low foam
- small water wave
- character relaxed

## Medium Speed

- more bubbles
- stronger vertical streaks
- more foam
- character leans more

## High Speed

- long vertical water streaks
- white foam bursts
- more camera shake
- red warning accents near pinch zones
- character panic face
- slight screen edge vignette

## Danger State

Triggered when the player is near being pinned.

Visuals:

```text
red exclamation icon
red edge vignette
character panic face
water foam slightly warmer
tiny screen shake
danger sound tick
```

Keep danger clear but not chaotic.

---

# 13. Typography

## Overall Typography Style

Use chunky, rounded, bold, playful lettering.

Text should feel like toy packaging or arcade candy.

Recommended characteristics:

- thick weight
- rounded terminals
- white fill or bright gradient
- dark purple outline
- soft shadow
- slight inner highlight

## Title Logo

The title should be large and memorable.

Examples:

```text
FLOOD RUSH
RISING RUSH
RISE UP!
AQUA PANIC
```

Title style:

```text
Top word: aqua / white / blue
Bottom word: orange / yellow
Thick dark purple shadow
Glossy highlights
Water droplets around blue letters
```

## Gameplay Text

Use very little text during gameplay.

Allowed:

```text
128
BEST 512
256m
SPEED!
NEW BEST!
```

## Button Text

Button text should be uppercase, thick, centered.

Examples:

```text
PLAY
RETRY
REVIVE x1
SWIPE TO START
COLLECT
```

## Text Effects

For important text:

- white fill
- dark purple outline
- slight drop shadow
- 1–2 px highlight
- bounce entrance animation

Avoid thin text and small labels.

---

# 14. UI System

## UI Philosophy

The UI should never compete with gameplay.

Every screen should have one main action.

## Gameplay HUD

Minimum HUD:

```text
Top left: score / height
Top center: distance marker or progress
Top right: pause button
```

Example:

```text
[128]
BEST 512

      256m
       |
       |
       |

                    [pause]
```

## Start Screen

The start screen should be the actual game scene frozen in a safe state.

Elements:

```text
Title
Best score chip
Shop/skin button
Character floating
Swipe tutorial
Primary start CTA
```

The first user action should be the same as gameplay input.

Primary instruction:

```text
SWIPE LEFT & RIGHT
SWIPE TO START
```

## Game Over Screen

Game over should be funny and quick.

Elements:

```text
SPLASH!
You got squished
Score
Best
Retry button
Revive button
```

Primary action:

```text
RETRY
```

Secondary monetization:

```text
REVIVE x1
WATCH AD TO REVIVE
```

The revive button should be yellow/reward-colored. Retry should be blue or green.

## Home / Meta Screen

The meta screen should stay lightweight.

Allowed:

```text
coins
settings
main character preview
3 skin cards
best distance progress
large PLAY button
```

Avoid:

```text
daily reward popup
battle pass
five currencies
too many buttons
forced ads
large shop grids
```

---

# 15. Icon Style

## Icon Rules

Icons should be:

- rounded
- thick
- simple silhouette
- high contrast
- placed inside rounded square buttons
- glossy but not too detailed

## Core Icons

Required icons:

```text
pause
shop/cart
settings gear
coin
crown/best
revive/video
retry
play
warning/exclamation
speed/lightning
shield/powerup
magnet/powerup
```

## Icon Container

Icon button style:

```text
rounded square
blue/cyan fill for normal actions
yellow/gold for rewards
green for positive
red/orange for danger
dark purple outline
soft shadow
small top-left highlight
```

---

# 16. Animation System

## Screen Transition Rules

All UI should feel bouncy and quick.

Recommended easing:

```text
easeOutBack for panels
easeOutCubic for movement
easeInOutSine for idle loops
```

## Start Screen Animation

Loop:

```text
title subtle bounce every 2.5s
character bobbing
water moving
bubbles rising
hand swiping left/right
CTA pulsing softly
```

When start input happens:

```text
CTA fades out
tutorial fades out
HUD remains
water speed begins increasing
camera starts scrolling
```

## Gameplay Animation

Continuous:

```text
water current scroll
bubbles rise
character bob/tilt
blocks scroll downward
side wall parallax
score counts upward
```

On direction change:

```text
character tilts
foam puff
small splash
eyes glance direction
```

On near collision:

```text
panic face
red warning icon
tiny shake
```

## Game Over Animation

Sequence:

```text
0.00s: character gets squashed/pinned
0.10s: foam burst
0.20s: screen shake
0.30s: background dim
0.45s: character dizzy appears behind/above panel
0.60s: SPLASH title pops in
0.75s: score panel appears
0.90s: retry button appears
1.05s: revive button appears
```

## Revive Animation

Sequence:

```text
0.00s: player taps revive
0.20s: ad finishes
0.30s: water drops slightly
0.45s: big splash ring
0.55s: character pops up smiling
0.75s: countdown 3,2,1
1.50s: gameplay resumes
```

---

# 17. Particle FX

## Bubble Particles

Small bubbles:

```text
spawn rate: depends on water speed
movement: upward
lifetime: 1.0–2.5s
alpha: fade in/out
scale: random
```

Large bubbles:

```text
spawn less often
larger near fast water
slight horizontal drift
```

## Foam Puffs

Use soft circular white blobs.

Properties:

```text
lifetime: 0.2–0.6s
scale up then fade
slight upward movement
spawn along surface
```

## Splash Droplets

Droplets should be simple circles/teardrops.

Use for:

```text
direction change
revive
game over
water speed boost
near wall collision
```

## Warning FX

Use sparingly:

```text
red exclamation marks
small red arrows toward pinch zone
red screen edge gradient
short alarm pulse
```

---

# 18. Screen-by-Screen Specification

## A. Start Screen

Purpose:

Introduce the game instantly and invite action.

Composition:

```text
Top:
Title logo

Upper corners:
Best score
Shop/skin button

Middle:
Obstacle cave scene

Lower-middle:
Character floating on water

Lower:
Swipe instruction
Large start button
```

Required text:

```text
FLOOD RUSH
SWIPE LEFT & RIGHT
SWIPE TO START
BEST 512
SHOP
```

Do not add:

```text
long tutorial
login
daily reward popup
multiple currencies
leaderboard
```

## B. Standard Gameplay Screen

Purpose:

Let the player focus on survival.

Composition:

```text
Top-left:
score and best

Top-center:
height / distance marker

Top-right:
pause

Center:
incoming obstacle gaps

Lower-middle:
character and water surface

Bottom:
water body and speed FX
```

Required:

```text
clear character silhouette
visible open path
bright water
orange blocks
minimal UI
```

## C. High-Speed Gameplay Screen

Purpose:

Communicate rising intensity.

Add:

```text
more water streaks
stronger foam
character tilt
panic face
speed meter, optional
warning icon near dangerous gap
```

Do not add:

```text
too many overlays
large tutorial text
full-screen effects hiding the path
```

## D. Near-Loss / Pinned State

Purpose:

Show the fail condition clearly.

Add:

```text
character close to blocks
red warning accents
squash/tilt
foam compression
screen-edge danger tint
```

## E. Game Over Screen

Purpose:

Make failure funny and push replay.

Required:

```text
dimmed gameplay background
dizzy/squashed character
SPLASH!
You got squished
Score
Best
Retry
Revive ad button
```

## F. Home / Skin Screen

Purpose:

Simple meta progression without overwhelming the player.

Required:

```text
coins
settings
title
main character preview
3 skin cards
best distance progress
PLAY button
```

Skins should preserve rectangular silhouette.

Example skins:

```text
pirate block
robot block
duck block
frog block
shark block
cardboard box block
```

---

# 19. Consistency Rules

Every asset should follow these rules:

## Shape Rules

```text
rounded corners
thick forms
soft bevels
big silhouettes
no thin details
```

## Lighting Rules

```text
top-left highlight
bottom-right shadow
soft drop shadow
bright rim on important objects
```

## Color Rules

```text
water always aqua/cyan
blocks always orange/warm
background always purple/dark
player always high-contrast green or skin variant
UI panels always dark purple
primary buttons green or blue
reward buttons yellow
danger red
```

## UI Rules

```text
one main CTA per screen
big buttons
rounded panels
thick text
minimal labels
safe-area friendly
```

## Animation Rules

```text
everything important pops or bounces
gameplay UI stays stable
failure is funny
water is always moving
character always feels alive
```

---

# 20. Asset List

## Gameplay Assets

```text
player_base_idle
player_swim_left
player_swim_right
player_panic
player_pinned
player_dizzy
player_victory

block_normal_01
block_normal_02
block_cracked
block_warning
block_shadow

cave_wall_left
cave_wall_right
cave_background_gradient
small_plant_01
small_rock_detail_01
```

## Water Assets

```text
water_shader_fill
foam_strip
foam_blob_01
foam_blob_02
bubble_small
bubble_medium
bubble_large
splash_drop
splash_ring
speed_streak
wake_puff
```

## UI Assets

```text
button_primary_green
button_secondary_blue
button_reward_yellow
panel_purple
icon_pause
icon_play
icon_retry
icon_revive_video
icon_shop
icon_settings
icon_coin
icon_crown
icon_warning
icon_speed
```

## Text Assets

```text
title_logo
score_text_style
button_text_style
small_label_style
warning_text_style
```

---

# 21. AI Generation Prompt Template

Use this template when asking an AI to create new screens or assets.

```text
Create a polished 2D hyper-casual mobile game asset/screen for a game called Flood Rush.

The game is about a stupid funny rectangular non-human creature floating on the surface of violently rising aqua water inside underground cave channels. The player swims left/right to avoid orange rounded clay block obstacles. If pinned by blocks and pushed off-screen, the player loses.

Visual style:
Chunky Underground Aqua Rush. Bright aqua water, white foam, bubbles, orange clay blocks, dark purple cave background, rounded toy-like shapes, glossy soft 2D shading, simple readable hyper-casual UI, no realism, no horror, no clutter.

Character:
A simple rounded rectangular green creature with big silly eyes, goofy mouth, small side fins/arms, expressive squash/stretch, easy to animate in 2D.

Design rules:
Readable in one second. Keep UI minimal. One main action. Strong contrast. Easy to implement in a 2D game engine. Use sprite-friendly shapes and simple effects.

Create:
[describe exact screen or asset]

Do not:
Use realistic humans, complex 3D, dark water, cluttered menus, tiny text, overly detailed backgrounds, or unreadable effects.
```

---

# 22. SKSL Prompt Template for Water Work

Use this when asking an AI to write or improve water shader code.

```text
Write an SKSL RuntimeEffect shader for a 2D mobile hyper-casual game water layer.

The shader should render bright aqua rising water for a vertical runner game. The water fills from the bottom up to a normalized water level. It needs a wavy animated surface, vertical current streaks, procedural bubbles, foam around the surface, and speed-based intensity.

Uniforms:
uResolution, uTime, uWaterLevel, uSpeed, uPlayerX, uPlayerVelocity, uDanger, uFoamAmount.

Visual target:
Bright cyan/aqua water with white foam, bubbly, juicy, energetic, readable, not realistic. The water should feel like a powerful upward current pushing a character upward.

The shader should be efficient for mobile and should avoid expensive loops. Use simple sine waves, hash/noise, smoothstep, gradients, and masks. The shader should output transparent pixels above the water surface and water pixels below it.

Also explain which effects should remain as particles/sprites instead of shader logic.
```

---

# 23. Final Quality Checklist

Before accepting any new screen or asset, check:

## Readability

```text
Can the player instantly see the character?
Can the player instantly see danger?
Can the player instantly see open gaps?
Is the water surface clear?
```

## Style Consistency

```text
Does it use aqua water?
Does it use orange blocks?
Does it use purple cave depth?
Are shapes rounded and chunky?
Does UI use the same button/panel language?
```

## Implementation Feasibility

```text
Can this be built with sprites, shader layers, and particles?
Are effects reusable?
Are there too many unique assets?
Does it avoid complex 3D?
```

## Hyper-Casual Fit

```text
Is there one obvious action?
Is the screen uncluttered?
Is failure funny?
Is replay fast?
Is the mascot memorable?
```

## Water Quality

```text
Does water feel alive?
Is foam readable?
Are bubbles moving upward?
Does speed change the water intensity?
Does danger affect water/edge FX without hiding gameplay?
```

---

# 24. Final Direction Summary

The game should look like a polished 2D arcade flood-survival game.

The visual identity is:

```text
Bright aqua water
Orange rounded clay blocks
Deep purple cave
Goofy green rectangular mascot
White bubbly foam
Chunky rounded UI
Minimal gameplay HUD
Funny failure states
Fast replay loop
```

The most important thing is not realism. The most important thing is:

> clarity + juice + consistency.

Every visual choice should help the player understand the mechanic faster and want to retry immediately.
