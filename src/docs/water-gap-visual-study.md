# Water Gap Surge Visual Study (Hyper-Casual, Practical)

This document proposes a **fake-but-believable** visual model for water moving through obstacle gaps in a vertical hyper-casual swimmer game.  
The goal is not fluid simulation. The goal is **instant readability, low GPU cost, and controllable feel** under fast gameplay.

---

## 1) Honest assessment of the current visual setup

Right now, the water is rendered as a full-width rectangle and obstacles are drawn over it. This is efficient, but visually it says:

- the whole row fills uniformly,
- lateral pressure does not exist,
- gaps do not affect the visible flow path.

For your mechanic, this is a mismatch. Your gameplay already encodes directional push (`forceDirection`) from row gap center changes, but the visuals still communicate "flat rising pool."  
Players may not consciously notice this, but they *feel* that the water behavior and movement response are disconnected.

The biggest realism blocker is not wave shape. It is **occupancy**: if blocks occupy most columns, players should not see a full-width free surface at that row.  
So the first visual truth to restore is: **only the gap span is actively surging at the surface transition band**.

---

## 2) Target visual language (arcade, not simulation)

The water should read like a pressurized river climbing a shaft:

- Deep body below the active row stays mostly stable and full-width (cheap and readable).
- Near the current surface row, the visible active surface width narrows to the row gaps.
- The surface line leans toward the next row opening direction (left or right).
- Flow texture inside the active band shows stronger advection in the surge direction.
- Foam and bubbles become denser in the bottleneck (gap center), with short bursts during row transitions.

This gives a clear mental model:  
**"Water is being squeezed through holes, then re-spreading."**

Arcade priority: exaggerate signal over realism.

- Tilt can be stronger than physically correct.
- Bubble/foam pulses can be timed and stylized.
- Transition can be eased so visuals feel juicy even if underlying row logic is discrete.

---

## 3) Core trick: two-zone water model (simple + strong)

Use a two-zone representation:

1. **Body Zone (below transition band)**  
   - Keep full-width body (current behavior mostly OK).  
   - Minor horizontal flow hints only.

2. **Surface Transition Zone (around current row height)**  
   - Apply a gap mask (current row gap range).  
   - Apply directional tilt and pressure effects only here.  
   - Optionally blend toward previous row gap mask for continuity.

Why this works:

- Most of the screen remains cheap and visually stable.
- All "complexity budget" is focused where players look (near swimmer + upcoming obstacles).
- You avoid trying to remap the entire water body every frame.

---

## 4) What "physically convincing enough" looks like in your game

At the moment a new row reaches water surface:

- Surface width compresses to the current row gap span.
- Surface is not horizontal: one side is slightly higher, one lower, leaning toward downstream gap direction.
- A short pressure pulse travels through the visible gap span (0.2s-0.4s), then decays.
- Bubble stream rises from gap center upward through the surface band.
- Foam "whitens" mainly near the squeezing edges and at the leading side of flow.

When there are no explicit gaps (`gaps` undefined or empty in your rest rows):

- Treat as central channel between side walls.
- Keep surface wide, with low tilt amplitude.
- Keep foam/bubble density low (rest state).

This preserves game readability: calm rows look calmer, directional rows look dangerous.

---

## 5) Recommended implementation architecture (fits your ECS)

### A) Water data you should carry each frame

You already compute `forceDirection`. Expand water visual state with:

- `surfaceRowYNorm` (0..1 in container UV)
- `currentGapStartNorm`, `currentGapEndNorm`
- `prevGapStartNorm`, `prevGapEndNorm`
- `gapCenterNorm`
- `gapWidthNorm`
- `flowDirection` (-1..1, smoothed)
- `surgePhase` (0..1 pulse on row change)
- `surgeStrength` (0..1, derived from direction delta + gap compression)

This lives in `Water` component and is written in `WaterPhysicsSystem`.

### B) Shader uniforms to add

Add uniforms for:

- `uGapCurrent: vec2` (`start,end`)
- `uGapPrev: vec2`
- `uGapBlend: float` (0..1)
- `uFlowDir: float` (-1..1)
- `uGapCenter: float`
- `uGapWidth: float`
- `uSurfaceBandCenterY: float`
- `uSurfaceBandHalfHeight: float`
- `uSurge: float` (0..1)

Update these in `WaterShaderSystem` via `ecs.updateComponent(Render...)`.

### C) Row-gap conversion

Given columns count `C`, and gap indexes in row:

- `gapStartCol = min(gaps)`
- `gapEndCol = max(gaps)`
- Convert to normalized x in container UV:
  - `start = gapStartCol / C`
  - `end = (gapEndCol + 1) / C`

If no gaps:

- use central channel default (for example `start=1/C`, `end=(C-1)/C`) matching your "only side walls blocked" rule.

### D) Surface band logic

In shader:

- Compute `bandMask = smoothstep(...)` around `uSurfaceBandCenterY`.
- Build `gapMaskCurrent` from `uGapCurrent`.
- Optional continuity: `gapMask = mix(gapMaskPrev, gapMaskCurrent, uGapBlend)`.
- Apply tilt only where `bandMask * gapMask` is high.

This creates "water only exists in gap" illusion where it matters, without breaking full body below.

---

## 6) Visual formulas (arcade-first)

### Surface tilt

Use a cheap line offset:

- `tilt = uFlowDir * uSurge * tiltMax`
- `surfaceY += tilt * ((x - uGapCenter) / max(uGapWidth, eps))`

Clamp this effect inside gap and near the surface band.

### Compression pulse

When row changes:

- set `surgePhase = 1`
- decay over time in system: `surgePhase = max(0, surgePhase - dt * decayRate)`
- shader uses `uSurge = surgePhase`

Effect:

- increases foam opacity,
- increases flow streak speed near gap center,
- slightly amplifies tilt for a short time.

### Bubble and foam density

Density should depend on:

- narrower gap -> higher density
- stronger direction/transition -> higher density

Practical scalar:

- `pressure = saturate((1 - gapWidthNorm) * 0.7 + abs(flowDir) * 0.3)`

Use `pressure` to modulate:

- bubble spawn probability in active band,
- foam threshold near surface edge.

---

## 7) Performance and production risks (brutally honest)

1. **Biggest risk is over-engineering shader logic.**  
   If you add too many branches/noise layers, older Android devices will choke. Keep to 1-2 noise calls in surface band and cheap masks.

2. **Second risk is desync between physics and shader uniforms.**  
   If gap metrics are stale for even a few frames, tilt looks random and "buggy." Always update water visual params in one consistent system order.

3. **Third risk is visual ambiguity under obstacle overlap.**  
   Because obstacles hide water by z-order, extreme tilt can look like clipping artifacts. Keep tilt amplitude moderate and localized.

4. **Fourth risk is trying to fake full 2D fill front.**  
   Not worth it for this genre. Restrict the fake to a narrow transition band and sell it with foam/bubbles.

---

## 8) Minimal viable implementation (recommended path)

Phase 1 (high value, low risk):

- Add gap uniforms and flow direction uniforms.
- Add surface transition band.
- Limit surface visibility to current gap in the band.
- Add directional tilt in the band.

Phase 2 (juice):

- Add surge pulse on row change.
- Add pressure-weighted bubbles + foam concentration near gap center.

Phase 3 (optional polish):

- Cross-fade previous/current gap masks to avoid snapping.
- Add tiny lateral wobble to swimmer splash response when surge peaks.

This phased path gives a visible improvement quickly and keeps rollback easy.

---

## 9) Final recommendation

The best balance for your game is:

- **Do not** simulate water occupancy for the whole container.
- **Do** fake it strongly in a narrow surface transition band using row gap masks + directional tilt + pressure pulses.
- **Do** keep body water simple and stable for readability.

That approach is the most natural-feeling for players, the easiest to tune by game designers, and the safest for mobile performance in a hyper-casual loop.

