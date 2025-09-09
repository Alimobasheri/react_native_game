# Surfer Physics System

This directory contains a new worklet-based physics system for the surfer character in the ReactNativeTurboGameEngine (RNTGE).

## Files

### `SurferPhysicsSystem.ts`

The main physics system that runs on the ECS framework. This system:

- Finds surfer entities with the required components (Surfer, MatterBody, Position)
- Locates the centered sea layer for physics calculations
- Applies buoyancy, friction, and positioning to surfers

### `surferWorklets.ts`

Worklet functions for physics calculations:

- `getWaterSurfaceHeightAtPoint()` - Calculates water surface height at any X position
- `calculateSurferSubmersion()` - Determines how much of the surfer is underwater
- `positionSurferOnSea()` - Positions surfer on the water surface
- `applySurferBuoyancy()` - Applies realistic buoyancy forces
- `applySurferFriction()` - Applies water/air friction based on submersion

### `surferTypes.ts`

TypeScript types and interfaces for the surfer physics system:

- Configuration types for physics parameters
- Data structures for submersion and force calculations
- Callback types for applying forces and setting properties

## Integration

The system integrates with:

1. **RNTGE ECS**: Uses the entity-component-system architecture with worklet-safe component data
2. **Matter.js**: Physics bodies and force application through MatterReanimated
3. **Sea Layer System**: Wave calculations and water surface detection
4. **Shader System**: Positions surfer correctly on shader-rendered sea
5. **Component-based State**: Initialization tracking stored in surfer component data (worklet-safe)

## Usage

1. Include `SurferComponentName` in the `componentNames` array when initializing RNTGE
2. Use `SurferView` component which automatically:
   - Creates surfer entity with required components
   - Registers the physics system
   - Sets up Matter.js body with appropriate properties

## Physics Features

- **Buoyancy**: Realistic water displacement forces based on Archimedes' principle
- **Wave Interaction**: Surfer responds to wave forces and movements
- **Surface Positioning**: Automatically positions surfer on water surface
- **Friction**: Dynamic friction based on water/air contact
- **Collision**: Proper collision filtering for game interactions

## Performance

All calculations are performed in worklets for optimal performance:

- No bridge communication for physics calculations
- Efficient component queries using ECS bit operations
- Minimal garbage collection through worklet optimization
