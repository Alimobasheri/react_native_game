# Swimmer Internal Life — Ultimate System Plan

**Status:** Planning document (June 2026)  
**Author intent:** Replace the failed flat-rectangle overlay chain with a correct, shippable internal animation system.  
**No code changes in the session that produced this doc.**

---

## Executive summary

The aqua-sprout "internal ripple" does not work because **the implementation targets the wrong effect, on the wrong render path, built on the wrong thread**. The body art already contains caustic/light patterns; design asks to **animate light inside the jelly**, not slide a colored rectangle through a hitbox.

The fix is not more opacity tuning. It is:

1. **Masked shader composite** on the body (UV-scroll caustics inside body alpha)
2. **UI-worklet-only** layer/bootstrap (never pre-build `renderLayers` on JS)
3. **Engine render policy** `animatedComposite` that never picture-caches life animation
4. **Dedicated `SwimmerLifeSystem`** for phase/uniforms, separate from crest/hair/deformation

---

## 1. What the animation actually is

### Body art inspection (`aqua-sprout-body.webp`)

The sprite is a vertical rounded jelly block with:

- Pre-painted **caustic network** (bright refracted lines, cell-like shapes)
- **Depth gradient** (lighter top, darker teal bottom)
- Soft **surface meniscus** and one bubble
- Dark outline / glow rim

### Design intent (canonical docs)

| Source | Requirement |
|--------|-------------|
| `swimmer-skins.md` — Aqua Sprout | "Semi-opaque aqua/teal jelly; **subtle internal water ripples**" |
| `swimmer-skins.md` — motion | "**Slow upward ripple**" |
| `swimmer-character-system.md` | Layer 2: "**Internal overlay (masked in body)** — ripples, bubbles, veins, shimmer" |
| `swimmer-character-system.md` | "Mask **internal texture motion** inside the body" |

### Player-perceptible target

- **Yes:** caustic highlights gently **drift upward** inside the silhouette; creature feels like living gel.
- **No:** visible foreign bar, sticker, or second rectangle inside the hitbox.

### Kelp Drifter (same system, different profile)

- Body art: faint internal strands (static)
- Motion: **slow horizontal sway** of internal organic phase — not a green SoftLight rectangle

---

## 2. Why the current approach failed (lessons)

### Wrong effect primitive

`swimmerInternalRipple.ts` animates:

- `offsetY` of a solid rectangle
- opacity pulse on `#ff00ff` / cyan fill

Industry practice for jelly / water interiors:

- **UV scroll** of caustic/noise texture
- **Sine warp** of texture coordinates
- **Masked composite** using sprite alpha (Unity jelly shaders, Skia `RuntimeShader` with `image.eval(xy)`)

A magenta band proving "something draws" would still be the **wrong feature**.

### Wrong render architecture

| Issue | Detail |
|-------|--------|
| `renderLayers` blocks top-level `shader` | `render.ts` L175: shader ignored when `renderLayers` set. Water animates via shader; swimmer cannot. |
| Picture cache | Group recorded into `SkPicture`; poor fit for per-frame procedural fills and animated uniforms on RN Skia |
| System order | Game visual systems registered after `renderSystem`; render drew stale state |
| JS → UI entity bootstrap | `SwimmerView` builds `renderLayers` in JS `useMemo`; bridge drops `fillColor` / `BlendMode` / whole layers |

### Silent failure mode

If internal layer is missing → 3 layers instead of 4 → `SwimmerEntityVisualSystem`:

```ts
if (layers.length <= accessoryLayerIndex) continue; // accessoryIndex === 3
```

**Entire visual pass skipped** — no ripple, no blink updates, no isDirty forcing.

### Process failure

- Handoff log marked internal overlay "done" while `swimmer-character-system.md` still said "not implemented"
- Debug focused on visibility of wrong primitive (magenta rect) instead of pipeline proof (mask + UV)

### Do not repeat

- More blend/opacity tuning on `fillColor` bands
- Picture-cache / live-draw workarounds without changing effect type
- Building `renderLayers` on JS thread
- Claiming done without device debug modes

---

## 3. Target architecture

### 3.1 Render policies (new engine feature)

Add explicit `renderPolicy` on `RenderComponentData`:

| Policy | Behavior | Examples |
|--------|----------|----------|
| `staticPicture` | Bake once, replay | Cave tiles, static UI |
| `liveGroup` | Rebuild group picture when dirty | Multi-layer sprites with frame anim |
| `animatedComposite` | **Never picture-cache**; draw shader or live group every frame | Water, swimmer body life |

**Invariant:** `renderSystem` always runs **last** in the ECS tick.

### 3.2 Masked composite (the missing engine primitive)

**Recommended:** Single `RuntimeEffect` composite on body group.

Conceptual SKSL:

```glsl
uniform shader body;       // aqua-sprout-body.webp
uniform shader caustics;   // tileable noise/caustic sheet (asset or procedural)
uniform float uPhase;
uniform float uIntensity;

half4 main(float2 xy) {
  half4 base = body.eval(xy);
  if (base.a < 0.01) return half4(0);

  vec2 uv = localUV(xy);  // 0..1 in mesh space
  vec2 scroll = vec2(0.0, -uPhase * 0.08);
  half4 c = caustics.eval(fract(uv + scroll) * causticSize);
  half3 rgb = base.rgb + c.rgb * uIntensity * base.a;
  return half4(rgb, base.a);
}
```

- **Mask = body alpha** — not hitbox `clipRect`
- **Animate = uniform `uPhase`** — no layer position hacks
- Reuses existing `drawShaderPath` pattern from water

**Alternative:** Dual art (`body.webp` + `internal.webp` per `swimmer-skins.md` asset convention) composited in same shader.

**Rejected:** `fillColor` rectangle in `renderLayers` index 1.

### 3.3 Entity bootstrap contract

```text
JS thread sends:     skinId, mesh dimensions, position, locomotion defaults
UI worklet builds:   renderLayers (images only), composite shader, tuning handles
```

`SwimmerView-rntge.tsx` must **not** call `buildSwimmerSkinRenderLayers()` in JS `useMemo`.

Canonical rebuild path already exists in `RestartGameplaySystem.ts` (worklet) — promote that pattern to initial spawn.

### 3.4 Game: Swimmer Life System

New module family: `src/Game/characters/life/`

```
swimmerLifeTypes.ts           # motion kinds, profiles
swimmerLifeDrivers.ts         # phase integrators per motion
swimmerLifeUniforms.ts        # phase → shader uniforms
swimmerInternalCompositeShader.ts
SwimmerLifeSystem.ts          # new ECS system
```

**Responsibility split:**

| System | Owns |
|--------|------|
| `SwimmerLifeSystem` | internal phase, breathing envelope, blink timers, motion profile |
| `SwimmerEntityVisualSystem` | deformation, crest/hair LaggingSpring, feature scale/opacity |
| `renderSystem` | draw policy, composite shader, depth sort |
| `swimmerSkins.ts` | static keys, motion profile id — not animation state |

### 3.5 Layer stack (final)

```text
Composite pass (body + internal motion shader)  ← ONE draw, animated
  → feature layer (eyes, blink)
  → crest layer (hair, LaggingSpring)
World-space water FX (unchanged)
```

Internal motion is **inside the body composite**, not a separate fill layer.

---

## 4. Aqua Sprout ripple — concrete spec

| Parameter | Value |
|-----------|-------|
| Cycle | 3.4s (`INTERNAL_RIPPLE_CYCLE_SEC`) |
| Motion | Upward UV scroll (~8% body height / cycle) |
| Intensity | 0.15–0.25 production (0.5 in debug) |
| Mask | Body texture alpha |
| Reduced motion | `uPhase` frozen when accessibility flag set |

**Debug modes (Storybook, required before aesthetic tune):**

1. `SHOW_MASK` — body alpha grayscale
2. `SHOW_CAUSTIC_UV` — scrolling tile masked (proves pipe)
3. `SHOW_COMPOSITE` — final
4. `SHOW_LAYER_COUNT` — expected vs actual

---

## 5. Implementation phases

### Phase 1 — Prove the pipe (critical path)

**Engine:**

- `renderPolicy: 'animatedComposite'`
- Masked body shader draw path in `renderSystem.ts`
- UI-worklet layer bootstrap (generic or swimmer-specific)
- Storybook `SwimmerInternalDebug`

**Game:**

- `SwimmerLifeSystem` → `uPhase` only
- Remove internal `fillColor` layer from aqua-sprout recipe
- Eyes + hair remain image layers on top

**Exit:** Debug mode 2 visible on real device inside jelly silhouette.

### Phase 2 — Production aesthetic

- Tune intensity, moiré avoidance against baked caustics
- Deformation-aware UV scale when `meshScaleY` changes
- Reduced-motion fallback

### Phase 3 — Kelp + hair

- `kelpSway` shader profile (horizontal phase shear)
- Hair: keep motion-anchor split; separate from internal life

### Phase 4 — Engine hardening

- Document render policies in engine README
- Tests: phase math + uniform snapshots
- `layerRecipe` for `bubble_bean`, `moss_chunk`

### Phase 5 — Optional art

- Shared `swimmer_caustics_tile.webp` (seamless 128×128)
- Per-skin `{skin}_internal.webp` if needed

---

## 6. Edge cases

| Case | Behavior |
|------|----------|
| JS entity create | Bootstrap layers frame 1 on UI worklet |
| Restart | `RestartGameplaySystem` resets layers + phase state |
| Skin swap | Full recipe rebuild |
| Pinned squash | UV rate scales with `meshScaleY` |
| Picture cache | `animatedComposite` never cached |
| Baked caustics in art | Low shader intensity to avoid moiré |
| Yellow App background | Irrelevant to mask; tune contrast anyway |
| Low-end Android | Single shader pass, intensity cap |
| `renderLayers` + `shader` | Resolved: body composite uses shader; eyes/hair use layers above |

---

## 7. Files map (future work)

**Engine:**

- `internal/components/render.ts` — `renderPolicy`, `compositeShader`, `layerRecipe`
- `internal/systems/renderSystem.ts` — animated composite path
- `services-ecs/system.ts` — render-last invariant
- New shader utilities under `internal/Shaders/` or game-registered SKSL

**Game:**

- New `src/Game/characters/life/*`
- Refactor `swimmerSkins.ts`, `SwimmerView-rntge.tsx`
- Deprecate band geometry in `swimmerInternalRipple.ts` (keep phase integrator)
- Honest update to `aqua-sprout-visual-handoff.md`, `swimmer-ai-context.md`

---

## 8. Definition of done

1. Debug UV scroll visible inside body silhouette on device
2. Non-developer identifies Aqua Sprout as "alive" within 3s idle
3. Kelp internal sway reads organic; hair root fixed
4. Storybook shows layer-count diagnostic on mismatch
5. No frame regression (one shader pass)
6. Next skin = new motion profile row, not new render hack

---

## 9. Next coding session (when ready)

1. Phase 1 only — shader composite + bootstrap + debug story
2. Do not tune beauty until debug mode 2 works on phone
3. Screen-record 3s regression clip
4. Then production tune + kelp profile

**Stop the workaround chain. Ship the correct primitive once.**
