# Log: Aqua Sprout visual wiring (handoff)

**Updated:** 2025-06-25  
**Skin:** `aqua-sprout` (default)  
**Scope of this log:** hair position/animation + eyes + internal life — what exists, what’s next.

---

## Done

| Item | State |
|------|--------|
| Assets | `assets/swimmer/characters/aqua-sprout/` — body 331×613, hair 242×228, eyes 250×50 |
| Asset registry | `src/assets/swimmerCharacters.ts` — all 3 keys registered; eyes preloaded in Storybook only |
| Skin def | `src/Game/characters/swimmerSkins.ts` — `AQUA_SPROUT_SKIN`, default skin; `feature` + `crestAccessory` + `internalMotion: 'ripple'` + `blinkType: 'tinyDotBlink'` |
| Render today | **4 layers:** body → internal ripple band → eyes → hair |
| Eyes layout | `featureWidthRatio: 0.58`, `featureRestOffsetYRatio: -0.28`, aspect 250/50 |
| Hair layout | `accessoryWidthRatio: 0.72`, `accessoryRestOffsetYRatio: -0.68` — crest **sprite bottom** at body mesh top |
| Layer indices | body=0, internal=1, feature=2, crest=3 — use `getSwimmer*LayerIndex(skin)` helpers |
| Eye blink | `swimmerFeatureBlink.ts` — 2.5–6s random interval, 90–140ms sin close; opacity + scaleY on feature layer |
| Internal overlay | `swimmerInternalRipple.ts` — soft band layer (fill `#8fe8f5`), 3.4s upward cycle, opacity pulse |
| Life tuning | `src/config/swimmerLifeTuning.ts` |
| Pinned crest | `getPinnedCrestRestOffsetY` + `PINNED_CREST_EXTRA_SCALE_Y: 0.72` in `SwimmerEntityVisualSystem` |
| Crest bend | `laggingSpringCrest.ts` — X lag + angle bend + wind lift + quadratic bend curve; bottom-anchor |
| Crest tuning | `secondaryItemTuning.ts` — `CREST_BEND_ANGLE_FACTOR: 0.048`, `CREST_BEND_ANGLE_CURVE: 0.0018`, clamp `0.55` |
| Motion today | Crest mode routed when `skin.crestAccessory`; blink/ripple in `SwimmerEntityVisualSystem` |
| Storybook preload | `Swimmer.stories.tsx`, `RNTGE.stories.tsx`, `ObstacleView-rntge.stories.tsx` |
| Tests | `swimmerSkins.test.ts` — 8 passing; `swimmerLifeAnimation.test.ts` — 3 passing; `swimmerEntity.test.ts` — 3 passing |

## Not done (future)

### A — Internal overlay clip / blend

- Ripple band is body-sized rect between body art and eyes; no Skia clip on fill layers yet (`renderSystem` fill path ignores `blendMode`)
- Engine task if true masked shader or SoftLight fill needed

### B — Crest stalk separation

- Still translate + rotate (no skew/mesh deform); may need sprite-sheet if art wants distinct stalk bend

### C — Remaining skins

- Only `aqua-sprout` + interim `goggled`; 10 canonical skins not started

## Key paths

```
src/assets/swimmerCharacters.ts
src/config/swimmerLifeTuning.ts
src/Game/characters/swimmerSkins.ts          # buildSwimmerSkinRenderLayers, layer index helpers
src/Game/characters/swimmerFeatureBlink.ts
src/Game/characters/swimmerInternalRipple.ts
src/Game/characters/accessories/laggingSpringCrest.ts
src/Game/ecs-components/Swimmer.ts           # featureBlinkState, internalRippleState on locomotion
src/systems/VisualSystem/SwimmerEntityVisualSystem.ts
src/config/secondaryItemTuning.ts
docs/visual-design/swimmer-ai-context.md
docs/visual-design/swimmer-character-system.md
```

## Constraints

- Game task: do **not** edit `RNTGE.tsx` or engine globals (`.cursor/rules/rntge-swimmer-game.mdc`)
- Renderer: `renderSystem.ts` draws `renderLayers` with per-layer `position`, `angle`, `opacity`; group origin = body center
- Hair sprite: visual anchor at **bottom** of image; placement uses **layer rect center** → offset math must account for `hairHeight/2`

---

## Future prompt (copy below)

```text
Read docs/visual-design/logs/aqua-sprout-visual-handoff.md and the AI context block in docs/visual-design/swimmer-ai-context.md.

Task: Aqua Sprout visual follow-up for skin `aqua-sprout`.

Done already: 4-layer render (body + internal ripple + eyes + crest), eye blink, crest bend polish, pinned crest squash.

Implement (or scope to what I specify):
1. Internal overlay clip/blend — true masked ripple or engine fill blendMode support
2. Crest stalk separation — skew/mesh or sprite-sheet if spring+rotate insufficient
3. Next skin from canonical list (kelp_drifter, bubble_bean, …)

Start with a short plan. Match existing swimmerSkins / SwimmerEntityVisualSystem patterns. No engine/RNTGE core changes unless item 1 needs renderSystem.
```
