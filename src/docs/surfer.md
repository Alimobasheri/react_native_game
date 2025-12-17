# Surfer Mechanics Documentation

## Overview

Simple arcade-style surfer physics using static positioning. Surfer follows water surface height with gentle buoyancy bobbing. No real physics forces - direct position updates override Matter.js gravity.

## Architecture

### Components & Systems

- **SurferView** (`src/components/SurferView/SurferView-rntge.tsx`): Creates surfer entity with Matter.js body
- **SurferPhysicsSystem** (`src/systems/PhysicsSystem/SurferPhysicsSystem.ts`): Calls worklet functions each frame
- **surferWorklets.ts**: Core physics logic (worklet functions)
- **surferPhysicsConfig.ts**: Minimal config (Matter.js body props + buoyancy params)

### Sea Layer Integration

- Uses **SeaLayerComponent** (layerIndex 1 = centered layer)
- Accesses `seaLayer.waves[]` array:
  - `waves[0]`: Base flow wave (continuous)
  - `waves[1]`: Dynamic touch wave (created by swipe)
- Sea layer provides: `windowWidth`, `windowHeight`, `y`, `height`, `waves[]`

## Wave Calculation

### Coordinate Systems

- **Shader**: Normalized coordinates (0-1), scales by `canvasSize.y` (windowHeight) when rendering
- **Worklet**: Pixel coordinates, must match shader's normalized-to-pixel conversion

### Key Functions

**`getWaterSurfaceHeightAtPoint(seaLayer, x)`**

- Calculates water height at surfer's X position
- Matches shader calculation exactly
- Returns pixel Y coordinate

**Base Wave (index 0)**

- Formula: `d = normalizedX + (time * speed)`
- Height: `-amplitude * sin(d * frequency * 0.5 + 0.5)`
- No scaling needed (amplitude already in correct units)

**Dynamic Wave (index 1+)**

- Formula: `dynamicStX = normalizedX + speed * time`
- Origin: `waveOriginNormalized = wave.x / windowWidth` (NOT centered - shader centers but we use actual position)
- Distance: `dynamicDistance = dynamicStX - waveOriginNormalized`
- Decay: `exp(-8.0 * abs(dynamicDistance))` (spatial decay)
- Height: `-amplitude * 0.05 * decayFactor * sin(...) * windowHeight`
- **Critical**: Must scale by `windowHeight` to convert normalized shader space to pixels

### Important Considerations

1. **Wave Origin**: Shader centers wave (`wave.x - windowWidth/2`), but physics uses actual `wave.x` position for correct peak location
2. **Wave Progression**: Added to pixel coordinate (`normalizedX + speed * time`), not to wave origin
3. **Amplitude Scaling**: Dynamic wave amplitude needs `windowHeight` scaling; base wave doesn't
4. **Distance Calculation**: Must account for wave movement over time - distance changes as wave propagates

## Positioning System

**`applyPlatformerSurferPhysics()`**

- Gets water surface height at surfer's fixed X (`initialX`)
- Adds buoyancy oscillation (sine wave)
- Sets position directly: `setBodyPosition({ x: initialX, y: targetY })`
- Overrides Matter.js gravity every frame

**`applySurferFriction()`**

- Zeros velocity each frame: `velocity.x/y = 0`, `angularVelocity = 0`
- Prevents gravity accumulation
- Works with static positioning to keep surfer in place

## Buoyancy Bobbing

- Sine wave oscillation: `sin(time * frequency * 2π) * amplitude`
- Configurable via `surferPhysicsConfig.ts`:
  - `buoyancyAmplitude`: pixels (default: 2)
  - `buoyancyFrequency`: cycles/second (default: 1.5)
- Time tracked in `surferStateData.buoyancyTime`

## Shader Connection

**Shader** (`src/Shaders/WaveShader/waveShader.ts`):

- Uses normalized coordinates (0-1)
- Centers dynamic wave: `dynamicWaveX = waves[1].x - windowWidth/2`
- Scales by `canvasSize.y` when rendering

**Worklet**:

- Uses actual wave position (not centered) for correct physics
- Must scale dynamic wave height by `windowHeight` to match shader's pixel output
- Base wave amplitude already matches shader units

## Key Files

- `surferWorklets.ts`: Core wave calculation and positioning logic
- `SurferPhysicsSystem.ts`: System that calls worklets each frame
- `surferPhysicsConfig.ts`: Config for Matter.js body + buoyancy params
- `SeaLayer.ts`: Component data structure with waves array
- `waveShader.ts`: Shader reference for wave calculation matching

## Debugging Notes

- Wave X positions can appear mirrored if distance calculation is inverted
- Wave must use actual `wave.x` position, not centered version
- Dynamic wave amplitude scaling is critical - missing `windowHeight` multiplier causes tiny/no effect
- Spatial decay (`exp(-8 * distance)`) makes waves fade with distance from origin
