# Log: Aqua Sprout visual wiring (handoff)

**Updated:** 2025-06-25  
**Skin:** `aqua-sprout` (default) · `kelp-drifter` (scaffold)  
**Scope of this log:** hair position/animation + eyes + internal life — what exists, what's next.

---

## Done

| Item | State |
|------|--------|
| Assets | `assets/swimmer/characters/aqua-sprout/` — body 331×613, hair 242×228, eyes 250×50 |
| Kelp Drifter assets | `assets/swimmer/characters/kelp-drifter/` — body 330×607, hair 438×407, eyes 188×22 |
| Asset registry | `src/assets/swimmerCharacters.ts` — aqua-sprout + kelp-drifter + goggled keys |
| Skin def | `src/Game/characters/swimmerSkins.ts` — `AQUA_SPROUT_SKIN`, `KELP_DRIFTER_SKIN`, default aqua-sprout |
| Render today | **4 layers:** body → internal overlay → eyes → hair |
| Eyes layout | `featureWidthRatio: 0.58`, `featureRestOffsetYRatio: -0.28`, aspect 250/50 |
| Hair layout | `accessoryWidthRatio: 0.72`, `accessoryRestOffsetYRatio: -0.68` — crest **sprite bottom** at body mesh top |
| Layer indices | body=0, internal=1, feature=2, crest=3 — use `getSwimmer*LayerIndex(skin)` helpers |
| Eye blink | `swimmerFeatureBlink.ts` — `tinyDotBlink` + `sleepyBlink` (kelp drifter) |
| Internal overlay | `swimmerInternalRipple.ts` (aqua) · `swimmerInternalKelpSway.ts` (kelp) |
| Internal clip/blend | `clipToGroupBounds` on internal layers + `blendMode` on fill path in `renderSystem.ts` |
| Aqua ripple visibility | Screen blend, `#c8fbff`, opacity 0.16–0.48, wider band (0.82×0.2 mesh) |
| Crest stalk skew | `laggingSpringCrest.ts` — stalk bend → `skewX`, tip → `angle`; `RenderLayerData.skewX` |
| Side-fringe hair | `laggingSpringSideFringe.ts` — strand-tip skew bob at aligner anchor (kelp-drifter) |
| Crest styles | `crestAccessoryStyle: 'upright' \| 'sideFringe'` on skin def |
| Life tuning | `src/config/swimmerLifeTuning.ts` |
| Pinned crest | `getPinnedCrestRestOffsetY` + `PINNED_CREST_EXTRA_SCALE_Y: 0.72` in `SwimmerEntityVisualSystem` |
| Crest bend | `laggingSpringCrest.ts` — X lag + angle bend + wind lift + quadratic bend curve; bottom-anchor |
| Crest tuning | `secondaryItemTuning.ts` — `CREST_STALK_SKEW_BLEND`, `CREST_STALK_SKEW_GAIN`, side-fringe constants |
| Motion today | Crest mode routed when `skin.crestAccessory`; blink/ripple/kelpSway in `SwimmerEntityVisualSystem` |
| Storybook preload | `Swimmer.stories.tsx`, `RNTGE.stories.tsx`, `ObstacleView-rntge.stories.tsx` |
| Tests | `swimmerSkins.test.ts` — 10 passing; `swimmerLifeAnimation.test.ts` — 4 passing; `laggingSpringCrest.test.ts` — 3 passing; `laggingSpringSideFringe.test.ts` — 3 passing |

## Not done (future)

### A — Body-alpha mask (optional polish)

- Internal overlay clips to body **rect**; not yet masked to rounded body art alpha
- Engine task if per-pixel body mask shader needed

### B — Crest mesh / sprite-sheet (optional polish)

- Skew + rotate covers stalk/tip separation for aqua-sprout; mesh deform or sprite-sheet if art needs more

### C — Remaining skins

- `kelp-drifter` wired with side-fringe hair animation; 9 canonical skins not started (`bubble_bean`, `moss_chunk`, …)

### D — Kelp internal body sway (optional)

- Kelp body art may include strands; procedural `kelpSway` overlay still available but `internalMotion: 'none'` today

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

---

## Future prompt (copy below)

```text
Read docs/visual-design/logs/aqua-sprout-visual-handoff.md and the AI context block in docs/visual-design/swimmer-ai-context.md.

Task: Swimmer visual follow-up.

Done: aqua-sprout ripple boosted (Screen blend), kelp-drifter sideFringe hair (left-root anchor + tip skew bob).

Next:
1. Body-alpha mask for internal overlay (optional)
2. Next skin: bubble_bean or moss_chunk

Match swimmerSkins / SwimmerEntityVisualSystem patterns. Engine changes only in renderSystem when needed.
```
