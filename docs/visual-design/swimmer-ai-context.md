# Swimmer Character — AI Context Summary

**Copy this section into future AI prompts** when working on swimmer art, skins, animation, or related systems.

Full docs: [Character System](./swimmer-character-system.md) · [Skins](./swimmer-skins.md) · [Personalities](./swimmer-animation-personalities.md)

---

## AI Context Summary (paste below)

```text
PROJECT: Flood Rush — 2D vertical hyper-casual mobile game (portrait).
PLAYER: A living aquatic rectangular slab (~1.8:1 height:width), NOT human/robot/mascot.
WORLD: Purple cave shaft, orange block obstacles, bright blue rising water.

CHARACTER NORTH STAR:
"A tiny living aquatic organism trapped inside a strict rectangular hitbox,
desperately surfing upward water pressure."

SHAPE RULES:
- Strict vertical rectangle, 1.8:1, straight parallel sides, slightly rounded corners
- NO arms, legs, mouth, nose, full face, big eyes, robot visors (except Goggle Tad skin)
- Personality via: body material, tiny eyes/features, top crest, internal texture motion,
  squash/stretch, water FX, accessory lag — NOT human acting

RENDER LAYERS (target):
1 body base → 2 internal overlay (masked) → 3 tiny feature/eyes → 4 top crest → 5 water FX

LIFE SYSTEM (minimum):
- Body breathing (~1.4–2.2s, subtle scale pulse)
- Internal texture motion (ripples, bubbles, veins — masked in body)
- Tiny blink (2.5–6s random, 90–140ms) or feature pulse
- Top crest LaggingSpring secondary motion
- Water contact: foam collar, side splash, wake, pivot burst

12 CANONICAL SKINS:
Aqua Sprout (default), Kelp Drifter, Bubble Bean, Moss Chunk, Coral Punk,
Sleepy Sponge, Ice Leaf, Lava Sprout, Pearl Ghost, Reef Royal, Goggle Tad, Bandaged Reef

8 ANIMATION PERSONALITIES (tuning profiles, not unique clips):
balanced, floaty, bouncy, heavy, snappy, smooth, aggressive, ghosty

LOCOMOTION VISUAL STATES:
Idle Float, Anticipation (45–70ms squash), Strike, Glide, Decelerating,
Pivot (strongest juice), Near Pin (danger tint/jitter), Pinned (sponge squash),
Revive (circular splash — not wired yet)

AVOID DRIFTING INTO:
childish mascot, robot slab, static sticker, square blob, full face, arms/legs,
large goggles on default skin, cheese/rock confusion with orange blocks

CURRENT CODE REALITY (React Native + Skia RNTGE ECS):
- Only 1 skin implemented: "goggled" (interim Goggle Tad placeholder)
- Body ratio 1.8:1 matches design (swimmerVisualTuning)
- Layers today: body + accessory only (goggles on face, not kelp crest)
- LaggingSpring accessory motion: YES
- Water FX system: YES (collar, splash, wake, pivot, pinned, danger tint)
- Internal overlay, blink, revive FX: NOT YET
- Default skin should become Aqua Sprout when art ready
- Legacy swimmer.styles.md §7 (arms/mouth/big eyes) is DEPRECATED

KEY CODE PATHS:
- swimmerSkins.ts, characterProfiles.ts, swimmerVisualTuning.ts
- swimmerDeformationTuning.ts, SwimmerEntityVisualSystem.ts
- laggingSpringGoggles.ts, SwimmerWaterContactFxSystem.ts
- swimmerLocomotionEvents.ts, characterMovementStates.ts
```

---

## Style Prompt for Image Generation

```text
Design a clean 2D front-view playable character skin for a vertical hyper-casual game called Flood Rush. The character is a living aquatic rectangular slab, not a human, not a robot, and not a mascot. The body is a strict 1.8:1 vertical rectangle with straight sides and slightly rounded corners. No arms, no legs, no mouth, no nose, no full face. Personality comes from body material, tiny eye/feature treatment, organic top crest, internal texture motion, water interaction, and procedural animation. The character must stay readable as the gameplay hitbox. Use polished mobile-game 2D art, clean dark outline, bright aquatic materials, and no background unless requested.
```

Append per-skin details from [swimmer-skins.md](./swimmer-skins.md) when generating specific skins.

---

## Suggested Data Model

Adapt to repo architecture — do not force if a simpler path works:

```ts
export type SwimmerAnimationPersonality =
  | 'balanced'
  | 'floaty'
  | 'bouncy'
  | 'heavy'
  | 'snappy'
  | 'smooth'
  | 'aggressive'
  | 'ghosty';

export type SwimmerInternalMotionType =
  | 'none'
  | 'ripple'
  | 'bubbleRise'
  | 'kelpSway'
  | 'mossPulse'
  | 'coralShimmer'
  | 'lavaPulse'
  | 'iceShimmer'
  | 'pearlShimmer';

export type SwimmerBlinkType =
  | 'none'
  | 'tinyDotBlink'
  | 'sleepyBlink'
  | 'emberPulse'
  | 'featurePulse';

export type SwimmerWaterFxStyle =
  | 'aqua'
  | 'bubble'
  | 'kelp'
  | 'moss'
  | 'coral'
  | 'sponge'
  | 'ice'
  | 'lava'
  | 'pearl'
  | 'reef';

export type SwimmerSkinRarity =
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary';

export interface SwimmerSkinArtDirection {
  id: string;
  displayName: string;
  role: string;
  bodyMaterial: string;
  eyeStyle: string;
  topStyle: string;
  accessoryStyle?: string;
  internalPattern: string;
  internalMotion: SwimmerInternalMotionType;
  animationPersonality: SwimmerAnimationPersonality;
  blinkType: SwimmerBlinkType;
  waterFxStyle: SwimmerWaterFxStyle;
  rarity: SwimmerSkinRarity;
  feeling: string;
  avoid: string[];
}
```

**Current `SwimmerSkinDefinition`** (`swimmerSkins.ts`) is a subset — extend incrementally:

```ts
// Today (implemented)
export type SwimmerSkinDefinition = {
  readonly id: SwimmerSkinId;
  readonly profileId: string;           // physics profile
  readonly bodyImageKey: string;
  readonly accessoryImageKey: string;
  readonly accessoryWidthRatio: number;
  readonly accessoryImageAspect: number;
  readonly accessoryRestOffsetYRatio: number;
};

// Future extensions (design-aligned)
// readonly animationPersonality: SwimmerAnimationPersonality;
// readonly internalMotion: SwimmerInternalMotionType;
// readonly blinkType: SwimmerBlinkType;
// readonly waterFxStyle: SwimmerWaterFxStyle;
// readonly internalOverlayImageKey?: string;
// readonly featureImageKey?: string;
// readonly crestImageKey?: string;
// readonly accessorySlot: 'crest' | 'face' | 'none';
```

---

## Quick Reference: Code vs Design

| Design concept | Code status |
|----------------|-------------|
| 1.8:1 body ratio | ✅ `VISUAL_HEIGHT_TO_WIDTH_RATIO: 1.8` |
| Anticipation squash | ✅ ~55ms visual phase + deformation |
| Pivot juice | ✅ pivot brake + fan splash + crest whiplash |
| Idle breathing | ⚠️ Subtle (~0.75% amplitude, target ~1.5%) |
| 12 skins | ❌ 1 skin (`goggled`) |
| Aqua Sprout default | ❌ Goggled is default |
| Top kelp crest | ❌ Goggles on face instead |
| Internal overlay | ❌ Not in render stack |
| Blink system | ❌ Not implemented |
| Animation personalities | ❌ Not in tuning |
| Near-pin body jitter | ❌ Water tint only |
| Revive splash ring | ❌ Event stub only |
| Old arms/mouth doc | ⚠️ Deprecated — use this doc instead |

---

## Related Technical Docs

| Doc | Purpose |
|-----|---------|
| `docs/visual-design/swimmer-character-system.md` | Full system spec + layer model + state tables |
| `docs/visual-design/swimmer-skins.md` | All 12 skins with matrix |
| `docs/visual-design/swimmer-animation-personalities.md` | Personality tuning tables |
| `src/docs/game-designer-llm-context.md` | Whole-game design context for LLMs |
| `src/containers/ReactNativeSkiaGameEngine/swimmer.styles.md` | Legacy art bible — **§7 character deprecated** |
| `.cursor/rules/rntge-swimmer-game.mdc` | RNTGE ECS architecture for game vs engine tasks |
