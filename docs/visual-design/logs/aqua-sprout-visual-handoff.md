# Log: Aqua Sprout visual wiring (handoff)

**Updated:** 2025-06-25  
**Skin:** `aqua-sprout` (default)  
**Scope of this log:** hair position/animation + eyes — what exists, what’s next.

---

## Done

| Item | State |
|------|--------|
| Assets | `assets/swimmer/characters/aqua-sprout/` — body 331×613, hair 242×228, eyes 250×50 |
| Asset registry | `src/assets/swimmerCharacters.ts` — all 3 keys registered; eyes preloaded in Storybook only |
| Skin def | `src/Game/characters/swimmerSkins.ts` — `AQUA_SPROUT_SKIN`, default skin; `feature` layer + `crestAccessory: true` |
| Render today | **3 layers:** body → eyes → hair (`buildSwimmerSkinRenderLayers`) |
| Eyes layout | `featureWidthRatio: 0.58`, `featureRestOffsetYRatio: -0.28`, aspect 250/50 |
| Hair layout | `accessoryWidthRatio: 0.72`, `accessoryRestOffsetYRatio: -0.68` — crest **sprite bottom** at body mesh top |
| Layer indices | body=0, feature=1, crest=2 — use `getSwimmerAccessoryLayerIndex(skin)` |
| Pinned crest | `getPinnedCrestRestOffsetY` + `PINNED_CREST_EXTRA_SCALE_Y: 0.72` in `SwimmerEntityVisualSystem` |
| Crest bend | `laggingSpringCrest.ts` — X lag + angle bend + wind lift, bottom-anchor via `getCrestBottomAnchorPosition` |
| Crest tuning | `secondaryItemTuning.ts` — `CREST_SPRING_*`, `CREST_BEND_*`, `CREST_WIND_*` |
| Motion today | Crest mode routed when `skin.crestAccessory`; goggles unchanged |
| Storybook preload | `Swimmer.stories.tsx`, `RNTGE.stories.tsx`, `ObstacleView-rntge.stories.tsx` |
| Tests | `swimmerSkins.test.ts` — 8 passing; `swimmerEntity.test.ts` — 3 passing |

## Not done (future)

### A — Eye blink

- Eyes render as static strip; no blink/pulse system yet
- Needs random 2.5–6s blink timer per `swimmer-character-system.md`

### B — Internal overlay (layer 2)

- Ripple/bubble motion masked inside body — not started

### C — Crest bend polish

- Current: translate + rotate with bottom-anchor compensation (no skew/mesh deform)
- May need stronger bend or sprite-sheet if art direction demands stalk separation

## Key paths

```
src/assets/swimmerCharacters.ts
src/Game/characters/swimmerSkins.ts          # buildSwimmerSkinRenderLayers, layer index helpers
src/Game/characters/accessories/laggingSpringCrest.ts
src/Game/ecs-components/Swimmer.ts           # layer index constants
src/systems/VisualSystem/SwimmerEntityVisualSystem.ts
src/Game/characters/accessories/laggingSpringGoggles.ts
src/Game/characters/swimmerEntityVisuals.ts
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

Done already: 3-layer render (body + eyes + crest), pinned crest squash, bottom-anchored crest bend spring, eyes at featureRestOffsetYRatio -0.28.

Implement (or scope to what I specify):
1. Eye blink — opacity/scale pulse on feature layer
2. Internal overlay — masked ripple inside body rect
3. Crest bend polish — stronger stalk bend if current spring+rotate insufficient

Start with a short plan. Match existing swimmerSkins / SwimmerEntityVisualSystem patterns. No engine/RNTGE core changes.
```
