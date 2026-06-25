# Swimmer Character Visual System

**Status:** Design north star (June 2025)  
**Audience:** AI agents, designers, developers  
**Related docs:** [Skins](./swimmer-skins.md) · [Animation personalities](./swimmer-animation-personalities.md) · [AI context summary](./swimmer-ai-context.md)

This document defines the intended playable character for **Flood Rush** (working title) / the vertical hyper-casual swimmer game in this repo. It supersedes the older character direction in `src/containers/ReactNativeSkiaGameEngine/swimmer.styles.md` §7 (arms, mouth, large eyes).

---

## Do / Don't

### Do

- Keep the body a **strict vertical rectangle** (~**1.8:1** height-to-width), honest to the gameplay hitbox.
- Express personality through **motion, material, water FX, tiny features, and top crest lag** — not human acting.
- Use **tiny bead eyes**, ember dots, sleepy marks, or feature pulses — never a full cartoon face.
- Allow **organic top crests** (kelp tuft, coral, foam cap, sprout) with **delayed spring motion**.
- Mask **internal texture motion** inside the body (ripples, bubbles, veins, shimmer).
- Keep silhouettes **readable on bright blue water** with a clean dark outline.
- Tie each skin to an **animation personality** profile (tuning multipliers, not hand-authored clips).

### Don't

- No arms, legs, hands, feet, torso, neck, separate head, mouth, nose, or eyebrows.
- No big mascot eyes, robot visors (except the dedicated **Goggle Tad** skin), sci-fi paneling, or human swimmer posing.
- No static sticker character — always show subtle life (breathing, internal motion, blink/pulse).
- No accessories that **visually widen** the perceived hitbox or hide the rectangle silhouette.
- No childish mascot energy, square-blob genericism, or cheese/rock confusion with orange block obstacles.
- Do not drift back toward `swimmer.styles.md` panic/victory states with raised arms, sweat drops, or open mouths.

---

## Character Species Definition

> A tiny living aquatic organism trapped inside a strict rectangular hitbox, desperately surfing upward water pressure.

The playable character is a **living rectangular water-creature slab**:

- **Alive, wet, buoyant** — flows with water, slightly serious, subtly funny through motion.
- **Not** a human, mascot, robot, or undifferentiated square blob.
- Personality comes from: body movement, buoyancy, squash/stretch, water interaction, tiny eye/feature animation, internal texture motion, top crest secondary motion, splash and wake FX.

### Global shape rules

| Rule | Value / note |
|------|----------------|
| Body shape | Strict vertical rectangle |
| Height : width | ~**1.8 : 1** |
| Sides | Mostly straight, parallel |
| Corners | Slightly rounded OK |
| Collision identity | Body silhouette = visual focus = hitbox honesty |
| Forbidden appendages | Arms, legs, mouth, full face, large accessories |

---

## Render Layer Model

Intended runtime stack (bottom → top):

```text
┌─────────────────────────────────────┐
│ 5. Water-contact FX (world space)   │  foam collar, side splash, wake, pivot burst
├─────────────────────────────────────┤
│ 4. Top accessory / crest layer        │  kelp, coral, foam cap — LaggingSpring motion
├─────────────────────────────────────┤
│ 3. Tiny feature / eye layer           │  bead eyes, ember dots — blink / pulse
├─────────────────────────────────────┤
│ 2. Internal overlay (masked in body)  │  ripples, bubbles, veins, shimmer
├─────────────────────────────────────┤
│ 1. Body base layer                    │  main 1.8:1 rectangular sprite
└─────────────────────────────────────┘
```

### Current codebase (what exists today)

| Layer | Implemented? | Code location |
|-------|--------------|---------------|
| 1. Body base | ✅ Yes | `buildSwimmerSkinRenderLayers()` in `src/Game/characters/swimmerSkins.ts` — layer 0 |
| 2. Internal overlay | ❌ No | Future: masked Skia layer or shader inside body rect |
| 3. Tiny feature / eye | ❌ No (baked into body art) | Future: separate sprite layer or UV-scroll shader |
| 4. Top accessory / crest | ⚠️ Partial | Layer 1 exists but current default skin uses **goggles on face**, not top crest |
| 5. Water-contact FX | ✅ Yes | `SwimmerWaterContactFxSystem`, `buildSwimmerContactFoamLayers`, `swimmerWaterFxTuning` |

**Evolution path:** Extend `SwimmerSkinDefinition` and `buildSwimmerSkinRenderLayers()` with optional layer slots (`internalOverlayKey`, `featureKey`, `crestKey`) before adding runtime blink/shimmer systems.

---

## Minimum Viable Life System

Characters must not read as static stickers. Target procedural life features:

| Feature | Design target | Current code |
|---------|---------------|--------------|
| **Body breathing** | scaleX 1.00–1.015, scaleY 1.00–0.985, ~1.4–2.2s loop | Partial: `IDLE_BUOYANCY_AMPLITUDE: 0.0075` in `swimmerDeformationTuning.ts` (~±0.75% scaleX) |
| **Internal texture motion** | ripple scroll, bubble rise, kelp sway, etc. | ❌ Not implemented |
| **Tiny eye blink** | random 2.5–6s, 90–140ms | ❌ Not implemented (eyes baked in body art) |
| **Top crest secondary motion** | lag on movement, whip on pivot | ✅ `LaggingSpring` in `laggingSpringGoggles.ts` — reuse for crests |
| **Water contact reaction** | collar, splash, wake, pivot burst, pinned burst | ✅ Full system with clearance-based danger tint |

---

## Locomotion / Animation States

Design states mapped to runtime systems.

### Physics movement states

Defined in `src/Game/characters/characterMovementStates.ts`:

```text
IDLE → ANTICIPATION → STRIKE → DRAG → GLIDE → DECELERATING → PIVOT_BRAKE
```

### Visual stroke phases (decoupled)

Defined in `src/Game/characters/visualStrokePhase.ts` — driven by `swimmerVisualLocomotion.ts` and `swimmerVisualTuning.ts`. Physics may advance immediately while visuals play anticipation over the first frames.

### State → visual effect table

| Design state | Visual intent | Physics / visual code | Water FX | Deformation |
|--------------|---------------|----------------------|----------|-------------|
| **Idle Float** | Gentle bob, tiny rotation, breathing, crest wave, soft foam collar | `MovementState.IDLE`, start-ready bob in `swimmerVisualTuning` | Continuous collar ripples | Idle buoyancy sine |
| **Anticipation** | 45–70ms squash, lean opposite tap, waterline dent, crest lag | `VisualStrokePhase.ANTICIPATION` (~55ms) | `SwimmerAnticipationDentEvent` | `ANTICIPATION_SCALE_X/Y` |
| **Strike / Move** | Lean toward direction, subtle stretch, trailing splash, crest trails opposite | `STRIKE`, tier combo angles | `SwimmerDirectionalSplashEvent` | Minimal strike stretch |
| **Glide** | Ease to smaller lean, wake at speed, crest settles | `GLIDE` + visual glide timer | `SwimmerWakeTrailEvent` when speed > threshold | Neutral scale |
| **Decelerating / Settle** | Return upright, breathing resumes, crest overshoot | `DECELERATING` / `RECOVERY` visual phase | FX quiet down | Interpolate to idle |
| **Pivot / Direction change** | Compress, rotation overshoot, crest whip, fan splash | `PIVOT_BRAKE` + `VisualStrokePhase.PIVOT` | `SwimmerPivotSplashEvent`, pivot fan preset | `PIVOT_BRAKE_SCALE` |
| **Near Pin / Danger** | Stiffen, micro-jitter, faster blink, turbulent foam, red waterline tint | Clearance-driven: `clearance01` in locomotion | `dangerEdge` preset, `NEAR_PIN_CLEARANCE01` tint | ⚠️ No body jitter yet |
| **Pinned / Fail** | Wet-sponge squash, crest flatten, upward burst, bubbles | `isPinnedFromAbove` → deformation `'PINNED'` | `SwimmerPinnedSplashEvent`, `pinnedBurst` | `PINNED_SCALE_X/Y` |
| **Revive / Respawn** | Pop from water, circular splash ring, rebound, crest bounce | ⚠️ Event stub only | `SwimmerReviveSplashEvent` — **not wired** | ⚠️ Not implemented |

### Timing reference (current tuning)

| Phase | Design | Code (`swimmerVisualTuning`) |
|-------|--------|-------------------------------|
| Anticipation | 45–70ms | `0.055s` (55ms) ✅ |
| Strike | — | `0.135s` |
| Glide settle | — | `0.26s` |
| Recovery | — | `0.14s` |
| Pivot visual | — | `0.15s` |

---

## Implementation Mapping (Current Codebase)

### Key files

| Concern | Path |
|---------|------|
| Skin definitions | `src/Game/characters/swimmerSkins.ts` |
| Character profiles (physics) | `src/Game/characters/characterProfiles.ts`, `characterProfileRegistry.ts` |
| Body ratio / collider split | `src/config/swimmerVisualTuning.ts` |
| Squash/stretch | `src/config/swimmerDeformationTuning.ts`, `proceduralDeformationEngine.ts` |
| Visual mediator | `src/systems/VisualSystem/SwimmerEntityVisualSystem.ts` |
| Accessory spring | `src/Game/characters/accessories/laggingSpringGoggles.ts` |
| Water FX | `src/systems/VisualSystem/SwimmerWaterContactFxSystem.ts`, `src/config/swimmerWaterFxTuning.ts` |
| Locomotion events | `src/Game/characters/swimmerLocomotionEvents.ts` |
| ECS component | `src/Game/ecs-components/Swimmer.ts` |
| View / entity setup | `src/components/SwimmerView/SwimmerView-rntge.tsx` |
| Assets | `src/assets/swimmerCharacters.ts`, `assets/swimmer/characters/` |

### What already aligns

- **1.8:1 visual mesh ratio** — `VISUAL_HEIGHT_TO_WIDTH_RATIO: 1.8` matches design spec exactly.
- **Separate visual vs collider** — expressive mesh wider/taller than navigation collider; pinned collider taller for fair ceiling contact.
- **Anticipation + pivot juice** — visual stroke phases, deformation presets, water dent/splash/pivot fan events.
- **Accessory lag** — `LaggingSpring` secondary item with pivot whiplash.
- **Danger communication** — foam collar tints red when `clearance01 < NEAR_PIN_CLEARANCE01`.
- **Pinned comedy squash** — exaggerated `PINNED_SCALE` deformation + upward dome splash.

### Incompatibilities / gaps (action items for future work)

| Gap | Design intent | Current state |
|-----|---------------|---------------|
| **Default skin** | Aqua Sprout (kelp tuft, bead eyes) | `DEFAULT_SWIMMER_SKIN_ID = 'goggled'` — Goggle Tad–like placeholder |
| **Skin count** | 12 canonical skins | 1 skin (`GOGGLED_SKIN`) |
| **Accessory placement** | Top crest (kelp, coral, foam cap) | Goggles centered on upper body (`accessoryRestOffsetYRatio: -0.34`) |
| **Animation personality** | 8 tuning profiles per skin | Single `GIGGLE_CRYSTAL_PROFILE` — physics only, no visual personality multipliers |
| **Internal overlay layer** | Masked ripples/bubbles inside body | Not in render stack |
| **Blink / feature pulse** | Procedural tiny blink | Eyes baked into body texture |
| **Near-pin body jitter** | Micro-jitter + faster blink | Only water FX danger tint |
| **Revive FX** | Circular splash ring + body rebound | Event type defined, handler not wired (`swimmerLocomotionEvents.ts` TODO) |
| **DRAG state visuals** | (Design doc silent) | Physics has `DRAG`; deformation treats as neutral |
| **Legacy art direction doc** | Aquatic slab organism | `swimmer.styles.md` still describes arms, mouth, large eyes — **deprecated for character art** |
| **Profile naming** | Per-skin personality | `giggle_crystal` profile ID is legacy placeholder name |
| **Suggested data model** | `SwimmerSkinArtDirection` with rarity, blink, internal motion | `SwimmerSkinDefinition` only has image keys + accessory layout ratios |

### Recommended future code changes (not implemented)

1. **Expand `SwimmerSkinDefinition`** toward the suggested art-direction shape (see [AI context](./swimmer-ai-context.md#suggested-data-model)).
2. **Add `SwimmerAnimationPersonalityTuning`** — multipliers on bob, rotation, squash, accessory lag, blink rate (see [personalities doc](./swimmer-animation-personalities.md)).
3. **Split accessory role** — `crestImageKey` vs `faceAccessoryKey` (goggles/bandage only).
4. **Add internal overlay render layer** — clipped rectangle with scroll/shimmer shader or animated sprite sheet.
5. **Wire `SwimmerReviveSplashEvent`** in `RestartGameplaySystem` + foam `reviveRing` preset.
6. **Replace default skin** with Aqua Sprout when art is ready; keep Goggle Tad as unlock skin #11.
7. **Deprecate or annotate** `swimmer.styles.md` §7–8 character sections with link to this doc.

---

## Asset Generation Prompt Template

Use when commissioning new skin sprites:

```text
Design a clean 2D front-view playable character skin for a vertical hyper-casual game called Flood Rush. The character is a living aquatic rectangular slab, not a human, not a robot, and not a mascot. The body is a strict 1.8:1 vertical rectangle with straight sides and slightly rounded corners. No arms, no legs, no mouth, no nose, no full face. Personality comes from body material, tiny eye/feature treatment, organic top crest, internal texture motion, water interaction, and procedural animation. The character must stay readable as the gameplay hitbox. Use polished mobile-game 2D art, clean dark outline, bright aquatic materials, and no background unless requested.
```

Per-skin additions: append body material, eye style, crest, internal pattern, and "avoid" notes from [swimmer-skins.md](./swimmer-skins.md).

---

## Document History

| Date | Change |
|------|--------|
| 2025-06 | Initial north-star doc from design brief; correlated with RNTGE swimmer implementation |
