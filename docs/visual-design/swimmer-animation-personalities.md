# Swimmer Animation Personalities

**Parent doc:** [Swimmer Character System](./swimmer-character-system.md)  
**Skins:** [Swimmer Skins](./swimmer-skins.md)

Animation personalities are **reusable tuning profiles** — not unique hand-authored animation clips. Each skin maps to one personality; personality values multiply base tuning constants.

---

## Personality Types

| Personality | Used by (skins) | Bob | Rotation | Squash | Accessory lag | Settle | FX character |
|-------------|-----------------|-----|----------|--------|---------------|--------|--------------|
| **balanced** | Aqua Sprout, Reef Royal (alt) | medium | medium | medium | medium | medium | clean, readable |
| **floaty** | Kelp Drifter, Pearl Ghost | higher | softer | lighter | more lag | slower | gentle bubbles |
| **bouncy** | Bubble Bean, Goggle Tad | energetic | moderate | bouncier | moderate | quick recoil | extra bubbles |
| **heavy** | Moss Chunk, Sleepy Sponge, Bandaged Reef | low | reduced | thicker | less whip | slow | thick foam |
| **snappy** | Coral Punk, Reef Royal (alt) | low-medium | quick | sharp pivot | moderate | fast recovery | aggressive splash |
| **smooth** | Ice Leaf | minimal | smooth | low squash | elegant lag | long ease | crisp particles |
| **aggressive** | Lava Sprout | low | punchy | strong pivot squash | moderate whip | fast | steam/sparks |
| **ghosty** | Pearl Ghost (alt) | high soft | slow | light | airy lag | very slow | sparkle bubbles |

---

## Personality → Tuning Multipliers (proposed)

Not yet in code. Suggested mapping onto existing config keys:

| Tuning key | File | balanced | floaty | bouncy | heavy | snappy | smooth | aggressive | ghosty |
|------------|------|----------|--------|--------|-------|--------|--------|------------|--------|
| `START_READY_BOB_PX` | swimmerVisualTuning | 1.0 | 1.35 | 1.2 | 0.6 | 0.85 | 0.75 | 0.7 | 1.5 |
| `START_READY_ROLL_DEG` | swimmerVisualTuning | 1.0 | 0.7 | 1.1 | 0.5 | 1.3 | 0.6 | 1.4 | 0.5 |
| `OPEN_WATER_MAX_ANGLE_TIER[*]` | swimmerVisualTuning | 1.0 | 0.85 | 1.05 | 0.75 | 1.15 | 0.9 | 1.2 | 0.7 |
| `IDLE_BUOYANCY_AMPLITUDE` | swimmerDeformationTuning | 1.0 | 1.2 | 1.4 | 0.7 | 0.9 | 0.6 | 0.8 | 1.3 |
| `ANTICIPATION_SCALE_X/Y delta` | swimmerDeformationTuning | 1.0 | 0.9 | 1.15 | 1.1 | 1.05 | 0.85 | 1.25 | 0.8 |
| `PIVOT_BRAKE_SCALE delta` | swimmerDeformationTuning | 1.0 | 0.95 | 1.1 | 1.15 | 1.2 | 0.9 | 1.35 | 0.75 |
| `LAGGING_SPRING_VELOCITY_FACTOR` | secondaryItemTuning | 1.0 | 1.3 | 1.0 | 0.7 | 0.9 | 1.1 | 1.0 | 1.4 |
| `LAGGING_SPRING_PIVOT_WHIPLASH` | secondaryItemTuning | 1.0 | 1.2 | 1.15 | 0.8 | 1.25 | 0.85 | 1.4 | 0.6 |
| `RECOVERY_DURATION_SEC` | swimmerVisualTuning | 1.0 | 1.35 | 0.85 | 1.4 | 0.75 | 1.25 | 0.7 | 1.5 |
| Blink interval | *(future)* | 1.0 | 1.2 | 0.85 | 1.3 | 0.9 | 1.1 | 0.8 | 1.4 |
| Water FX opacity/strength | swimmerWaterFxTuning presets | 1.0 | 0.9 | 1.15 | 1.1 | 1.2 | 0.95 | 1.25 | 0.85 |

Implementation sketch:

```ts
// Future: src/config/swimmerAnimationPersonalities.ts
export type SwimmerAnimationPersonality =
  | 'balanced' | 'floaty' | 'bouncy' | 'heavy'
  | 'snappy' | 'smooth' | 'aggressive' | 'ghosty';

export const getPersonalityMultipliers = (
  personality: SwimmerAnimationPersonality
) => ({ bob: 1.0, rotation: 1.0, /* ... */ });
```

Each `SwimmerSkinDefinition` would reference `animationPersonality` and systems would multiply base tuning at read time.

---

## Current Codebase: Physics Profiles vs Visual Personalities

Today, `ICharacterProfile` (`characterProfileTypes.ts`) controls **physics only**:

- `mass`, `baseDrag`, `baseStrikeForce`
- Combo tiers: `targetSwimAngles`, `comboForceMultipliers`, `comboWindowMs`
- `secondaryItemType`, `secondaryItemWeight`
- `pivotLockoutDurations`, `splashFxPrefabKey`

Only **`giggle_crystal`** profile exists. It uses `LaggingSpring` secondary item — compatible with crest/goggle accessories but **not** mapped to animation personality types yet.

**Recommendation:** Keep physics profiles and animation personalities **separate**:

- **Physics profile** — how the slab moves through water (mass, strike force, combo).
- **Animation personality** — how the slab *looks* while moving (bob, squash, lag, blink).

A skin can pair any compatible physics profile with an animation personality (e.g. Moss Chunk = heavy personality + slightly higher mass profile).

---

## Locomotion State Visual Notes by Personality

How personalities should *feel* during key states (design reference for tuning):

| State | balanced | floaty | bouncy | heavy | snappy | smooth | aggressive | ghosty |
|-------|----------|--------|--------|-------|--------|--------|------------|--------|
| Idle | calm bob | high drift bob | quick micro-bounce | low sink bob | minimal bob | glass-still | tense stillness | ethereal float |
| Anticipation | standard squash | soft compress | snappy dip | deep compress | sharp snap-back prep | subtle lean | violent tuck | slow inhale |
| Strike | clean lean | lazy lean | spring launch | sluggish lean | instant snap | silk glide | explosive lean | waft |
| Pivot | good juice | soft fan splash | bouncy whip | heavy slosh | **best juice** | controlled arc | steam + sparks | gentle ripple |
| Pinned | standard squash | slow deflate | pop then squash | max sponge | quick flatten | elegant crumple | burst upward | fade shimmer |
| Near pin | standard danger | soft panic | jittery | stiff | sharp jitter | cool tension | hot turbulence | faint shimmer |

---

## Anti-Robot Checklist

When tuning any personality, verify the character does **not** read as:

- [ ] Hard mechanical rotation only (no squash/breathing)
- [ ] Static sticker with no internal motion
- [ ] Sci-fi visor language (unless Goggle Tad)
- [ ] Rigid accessory glued to body (check LaggingSpring is active)
- [ ] Missing waterline connection (collar/splash absent at surface)

Prefer: buoyant tilt, soft elastic response, organic tuft lag, internal texture movement, waterline foam, wake/splash, tiny blink/pulse, body breathing.
