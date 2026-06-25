# Swimmer Skins — Canonical Collection

**Parent doc:** [Swimmer Character System](./swimmer-character-system.md)  
**Personalities:** [Animation Personalities](./swimmer-animation-personalities.md)

Twelve canonical skins for the aquatic rectangular slab species. All obey global shape rules: **1.8:1 vertical rectangle**, no arms/legs/mouth, tiny features only, readable hitbox silhouette.

---

## Skin Matrix

| ID (proposed) | Display name | Personality | Internal motion | Water FX style | Rarity | Default? |
|---------------|--------------|-------------|-----------------|----------------|--------|----------|
| `aqua_sprout` | Aqua Sprout | balanced | ripple | aqua | common | **Yes (target)** |
| `kelp_drifter` | Kelp Drifter | floaty | kelpSway | kelp | common/rare | |
| `bubble_bean` | Bubble Bean | bouncy | bubbleRise | bubble | common/rare | |
| `moss_chunk` | Moss Chunk | heavy | mossPulse | moss | rare | |
| `coral_punk` | Coral Punk | snappy | coralShimmer | coral | rare/epic | |
| `sleepy_sponge` | Sleepy Sponge | heavy | mossPulse | sponge | rare | |
| `ice_leaf` | Ice Leaf | smooth | iceShimmer | ice | epic | |
| `lava_sprout` | Lava Sprout | aggressive | lavaPulse | lava | epic/legendary | |
| `pearl_ghost` | Pearl Ghost | floaty / ghosty | pearlShimmer | pearl | epic | |
| `reef_royal` | Reef Royal | balanced / snappy | coralShimmer | reef | legendary | |
| `goggle_tad` | Goggle Tad | bouncy / balanced | bubbleRise | aqua | rare | |
| `bandaged_reef` | Bandaged Reef | heavy / nervous | coralShimmer | coral | rare/epic | |

**Current codebase:** only `goggled` exists (`GOGGLED_SKIN` in `swimmerSkins.ts`), mapped to legacy `giggle_crystal` physics profile. Treat as interim **Goggle Tad** placeholder until Aqua Sprout art ships.

---

## Per-Skin Specifications

### 1. Aqua Sprout *(default target)*

| Field | Value |
|-------|-------|
| **Role** | Default skin; visual anchor for the species |
| **Body** | Semi-opaque aqua/teal jelly slab; subtle internal water ripples; soft readable outline |
| **Eyes** | Two tiny black bead eyes — no mouth, no eyebrows |
| **Top** | One small green wet kelp tuft |
| **Internal motion** | Slow upward ripple |
| **Personality** | balanced |
| **Water FX** | Normal white/aqua foam collar; clean side splash; subtle wake |
| **Rarity** | common / default |
| **Feel** | Alive, simple, readable, aquatic |
| **Avoid** | Too cute; large eyes; goggles on default |
| **Implementation** | Replace `DEFAULT_SWIMMER_SKIN_ID`; body + crest layers; ripple internal overlay |

---

### 2. Kelp Drifter

| Field | Value |
|-------|-------|
| **Role** | Organic / relaxed skin |
| **Body** | Green-teal translucent; faint kelp strands inside |
| **Eyes** | Tiny sleepy bead eyes or soft closed-eye marks |
| **Top** | Longer swept kelp fringe leaning to one side |
| **Internal motion** | Kelp strands sway slowly |
| **Personality** | floaty |
| **Water FX** | Soft green-tinted bubbles; gentle foam |
| **Rarity** | common/rare |
| **Feel** | Slippery, relaxed, organic |
| **Avoid** | Hair too large; hiding hitbox |

---

### 3. Bubble Bean

| Field | Value |
|-------|-------|
| **Role** | Playful early unlock |
| **Body** | Bright aqua with trapped bubbles |
| **Eyes** | Tiny wide-set dot eyes |
| **Top** | Small foam cap |
| **Internal motion** | Bubbles rise inside body |
| **Personality** | bouncy |
| **Water FX** | Extra small bubbles on movement |
| **Rarity** | common/rare |
| **Feel** | Light, buoyant, energetic |
| **Avoid** | Mouth; babyish proportions |

---

### 4. Moss Chunk

| Field | Value |
|-------|-------|
| **Role** | Heavy cave-native skin |
| **Body** | Mossy green; organic speckles and patches |
| **Eyes** | Small sleepy dark eyes, half-hidden |
| **Top** | Stubby sprout |
| **Internal motion** | Subtle moss pulse or speckle shimmer |
| **Personality** | heavy |
| **Water FX** | Thicker foam puffs; darker green droplets if supported |
| **Rarity** | rare |
| **Feel** | Stubborn, grounded, cave-native |
| **Avoid** | Looking like orange rock block obstacles |

---

### 5. Coral Punk

| Field | Value |
|-------|-------|
| **Role** | Attitude / cool skin |
| **Body** | Purple-pink translucent reef; coral branch veins inside |
| **Eyes** | Tiny slanted eyes |
| **Top** | Sharp coral mohawk |
| **Internal motion** | Coral vein shimmer or pulse |
| **Personality** | snappy |
| **Water FX** | Pink/cyan splash accents |
| **Rarity** | rare/epic |
| **Feel** | Sharp, confident, motion-expressive |
| **Avoid** | Coral too wide; unreadable silhouette |

---

### 6. Sleepy Sponge

| Field | Value |
|-------|-------|
| **Role** | Humorous calm skin |
| **Body** | Yellow-orange sponge texture; small sponge holes |
| **Eyes** | Tiny droopy half-lid eyes |
| **Top** | One soft sponge nub |
| **Internal motion** | Subtle pore shimmer |
| **Personality** | heavy |
| **Water FX** | Thicker foam puffs |
| **Rarity** | rare |
| **Feel** | Funny because calm in chaos |
| **Avoid** | Mouth; cheese-block obstacle confusion |

---

### 7. Ice Leaf

| Field | Value |
|-------|-------|
| **Role** | Clean elegant skin |
| **Body** | Pale icy blue slab; thin ice crack pattern |
| **Eyes** | Tiny calm blue/gray dots |
| **Top** | Blue frozen leaf crest |
| **Internal motion** | Faint crack highlight shimmer |
| **Personality** | smooth |
| **Water FX** | Crisp small icy particles; cleaner wake |
| **Rarity** | epic |
| **Feel** | Elegant, slippery, premium |
| **Avoid** | Too transparent against water; weak outline |

---

### 8. Lava Sprout

| Field | Value |
|-------|-------|
| **Role** | High-value elemental skin |
| **Body** | Dark volcanic; glowing lava veins |
| **Eyes** | Tiny ember dots |
| **Top** | Red/orange flame-like organic tuft |
| **Internal motion** | Lava veins pulse and crawl upward |
| **Personality** | aggressive |
| **Water FX** | Steam puff on pivot; tiny orange spark accents |
| **Rarity** | epic/legendary |
| **Feel** | Hot, punchy, still aquatic-world compatible |
| **Avoid** | Huge flames; broken hitbox silhouette |

---

### 9. Pearl Ghost

| Field | Value |
|-------|-------|
| **Role** | Magical / rare skin |
| **Body** | Pale iridescent pearl; soft rainbow shimmer |
| **Eyes** | Tiny soft gray dots |
| **Top** | Small shell-like crest |
| **Internal motion** | Slow iridescent shimmer drift |
| **Personality** | floaty or ghosty |
| **Water FX** | Sparkle bubbles |
| **Rarity** | epic |
| **Feel** | Calm, magical, ethereal |
| **Avoid** | Low contrast on water; invisible outline |

---

### 10. Reef Royal

| Field | Value |
|-------|-------|
| **Role** | Premium noble skin |
| **Body** | Deep blue-violet reef; faint reef/coral texture |
| **Eyes** | Tiny proud dots or slanted eyes |
| **Top** | Small organic coral crown (in-world, not literal gold) |
| **Internal motion** | Subtle reef glow or coral shimmer |
| **Personality** | balanced or snappy |
| **Water FX** | Slightly brighter foam crown/rim |
| **Rarity** | legendary |
| **Feel** | Proud, premium, composed |
| **Avoid** | Literal gold king crown unless separate novelty skin |

---

### 11. Goggle Tad

| Field | Value |
|-------|-------|
| **Role** | Sporty accessory skin — **currently implemented as `goggled`** |
| **Body** | Clean turquoise with bubbles |
| **Eyes** | Hidden behind tiny round goggles (face accessory, not robot visor) |
| **Top** | None |
| **Accessory** | Goggles only — strong LaggingSpring lag |
| **Internal motion** | Light bubbles rise |
| **Personality** | bouncy or balanced |
| **Water FX** | Extra pivot splash |
| **Rarity** | rare |
| **Feel** | Swimmer-like, sporty, fun |
| **Avoid** | Huge goggles; robot look; mouth |
| **Code today** | `floater_goggled_body.webp` + `floater_goggled_goggles.webp`; `accessoryRestOffsetYRatio: -0.34` |

---

### 12. Bandaged Reef

| Field | Value |
|-------|-------|
| **Role** | Unlucky survivor skin |
| **Body** | Red-orange reef; internal coral veins |
| **Eyes** | One tiny visible eye; one covered/implied |
| **Top** | Tiny coral nub |
| **Accessory** | Small bandage patch over one top corner |
| **Internal motion** | Reef vein pulse |
| **Personality** | heavy or nervous variant of balanced |
| **Water FX** | Normal foam; slightly bigger fail splash |
| **Rarity** | rare/epic |
| **Feel** | Unlucky, resilient, funny through motion |
| **Avoid** | Large bandage; full face expression |

---

## Asset File Convention (proposed)

```text
assets/swimmer/characters/{skin_id}/
  {skin_id}_body.webp          # Layer 1 — body base
  {skin_id}_internal.webp      # Layer 2 — optional masked overlay
  {skin_id}_feature.webp       # Layer 3 — optional eyes (for blink swap)
  {skin_id}_crest.webp         # Layer 4 — optional top accessory
  {skin_id}_goggles.webp       # Layer 4 alt — face accessory (Goggle Tad only)
  {skin_id}_bandage.webp       # Layer 4 alt — corner patch (Bandaged Reef only)
```

Register keys in `src/assets/swimmerCharacters.ts` following existing `floaterGoggledBody` pattern.
