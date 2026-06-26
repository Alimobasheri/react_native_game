# Log: Aqua Sprout visual wiring (handoff)

**Updated:** 2026-06-26  
**Skin:** `aqua-sprout` (default) · `kelp-drifter` (wired)  
**Scope:** compositeShader internal life (replaces fillColor band overlay).

---

## Done

| Item | State |
|------|--------|
| Render stack | **compositeShader** (body + internal motion) → eyes (layer 0) → hair (layer 1) |
| Bootstrap | `SwimmerRenderBootstrapSystem` builds stack on UI worklet frame 1 |
| Life | `SwimmerLifeSystem` updates `compositeShader.uniforms` each frame |
| SKSL | `src/Shaders/SwimmerInternal/swimmerInternalComposite.ts` — `uDebugMode` 0–3 |
| Engine | `compositeShader` + `RenderPolicy.AnimatedComposite` — no picture cache |
| Debug story | `SwimmerInternalDebug` in `Swimmer.stories.tsx` — `lifeDebugMode` arg |
| Layer indices | eyes=0, hair=1 — `getSwimmerInternalLayerIndex()` always null |
| Kelp profile | `uMotionKind=1` horizontal shear in composite shader |
| Production tune | `INTERNAL_RIPPLE_INTENSITY: 0.2`, kelp `0.22` |

## Device verification (manual)

Run Storybook `SwimmerInternalDebug` on device with yellow background:

| Gate | `lifeDebugMode` | Pass criterion |
|------|-----------------|----------------|
| G0 | 3 | Body art via shader |
| G1 | 1 | White jelly silhouette |
| G2 | 2 | UV bands inside silhouette only |
| G3 | 0 | Subtle alive motion |
| G4 | — | Record 3s screen video |

## Deprecated (removed)

- `buildInternalMotionLayer` fillColor bands
- JS-thread `buildSwimmerSkinRenderLayers` on entity create
- `ensureSwimmerSkinRenderLayers` fill-layer repair

## Legacy reference (pre-composite)

### A — Body-alpha mask (optional polish)

- Internal overlay clips to body **rect**; not yet masked to rounded body art alpha
- Engine task if per-pixel body mask shader needed

### B — Crest mesh / sprite-sheet (optional polish)

- Skew + rotate covers stalk/tip separation for aqua-sprout; mesh deform or sprite-sheet if art needs more

### C — Remaining skins

- 9 canonical skins not started (`bubble_bean`, `moss_chunk`, …)

## Key paths

```
src/assets/swimmerCharacters.ts
src/config/swimmerLifeTuning.ts
src/Game/characters/swimmerSkins.ts
src/Game/characters/swimmerFeatureBlink.ts
src/Game/characters/swimmerInternalRipple.ts
src/Game/characters/swimmerInternalKelpSway.ts
src/Game/characters/accessories/laggingSpringCrest.ts
src/Game/characters/accessories/laggingSpringSideFringe.ts
src/Game/ecs-components/Swimmer.ts
src/systems/VisualSystem/SwimmerEntityVisualSystem.ts
src/config/secondaryItemTuning.ts
src/containers/ReactNativeSkiaGameEngine/internal/systems/renderSystem.ts
docs/visual-design/swimmer-ai-context.md
docs/visual-design/swimmer-character-system.md
```

## Constraints

- Game task: do **not** edit `RNTGE.tsx` or engine globals (`.cursor/rules/rntge-swimmer-game.mdc`)
- Renderer: `renderSystem.ts` draws `renderLayers` with per-layer `position`, `angle`, `skewX`, `opacity`, `clipToGroupBounds`, `blendMode`
- Hair sprite: visual anchor at **bottom** of image; placement uses **layer rect center** → offset math must account for `hairHeight/2`
- Side-fringe skins: use `accessoryMotionAnchorXRatio/Y` for skew pinning; keep `accessoryAnchorXRatio/Y` for static aligner placement

---

## Future prompt (copy below)

```text
Read docs/visual-design/logs/aqua-sprout-visual-handoff.md and the AI context block in docs/visual-design/swimmer-ai-context.md.

Task: Swimmer visual follow-up.

Done: kelp hair motion pivot split (left-root pinned during skew), kelpSway internal overlay, aqua ripple contrast (Overlay blend).

Next:
1. Body-alpha mask for internal overlay (optional)
2. Next skin: bubble_bean or moss_chunk

Match swimmerSkins / SwimmerEntityVisualSystem patterns. Engine changes only in renderSystem when needed.
```
