You are generating level data for a vertical, tile-based **“cave + rising water”** game.

### Grid / coordinates

**Production infinite run:** column count is **`LAYOUT_CONSTANTS.COLUMNS`** in `src/Layout.ts` (currently **8**). Always read that file — do not assume 15.

**Legacy JSON silhouette art** (`src/Game/templates/obstacles/*.ts`) may still use 15-col grids for pixel-art authoring. That is separate from the live gameplay grid (T-011).

- The play area is a **rectangular container**.
- The container width is divided into **N equal columns**, where \(N\) = `LAYOUT_CONSTANTS.COLUMNS` from `src/Layout.ts` (currently **8**).
- Each **row** is one tile tall, where tile size is \(tileWidth = containerWidth / N\). Rows stack upward like a grid.

### Row definition

- A row describes which columns are **open** (gaps) vs **blocked** (stone blocks).
- Columns are indexed **0..N−1** from left to right (currently **0..7**).
- Each row has:
  - `gaps`: array of open column indices (walkable / passable)
  - `blocks`: array of blocked column indices (solid obstacles)
- Constraint: `gaps ∪ blocks = {0..N−1}` and `gaps ∩ blocks = ∅`.

### Visual / gameplay meaning

- **Blocks**: solid stone tiles. The swimmer collides with them (cannot pass through).
- **Gaps**: empty tiles. The swimmer can occupy these columns to pass that row.
- Rows scroll downward over time, so the player must steer left/right to stay in gaps.

### Continuity rules (so paths are always possible)

To avoid impossible levels, enforce continuity between consecutive rows:

- Each row must have at least one gap.
- For a **single main path**: ensure `gaps(row i)` overlaps `gaps(row i-1)` by at least **1 column** (or shifts by at most 1 column).
- For **multiple paths**: treat gaps as **contiguous ranges** (lanes). Keep up to **4 lanes**, each lane at least **2 columns wide**, and each lane in row \(i\) must overlap some lane in row \(i-1\) by at least **1 column**.

### Water behavior (how it “flows”)

- Water fills from the bottom upward; the surface is a horizontal band near the current water level.
- The water surface/foam is **only visible through gap columns** in the row that intersects the surface band (and blends toward the previous row), so it looks like water is being **channeled through openings** between rocks.
- When the gap pattern shifts left/right or splits/merges, the surface band curves/tilts to suggest pressure and lateral flow, but the key rule is: **surface visibility is gated by gaps**.

- The first rows of the json are the bottom of the rendered rows. It's from bottom to top.

### JSON shape you should output

Produce:

```json
{
  "columns": 15,
  "rows": [
    { "gaps": [6, 7, 8], "blocks": [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14] },
    { "gaps": [5, 6, 7], "blocks": [0, 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14] }
  ]
}
```

That JSON fully defines the cave lanes (gaps) and stone placement (blocks) per row; the game engine can spawn blocks in `blocks` columns and leave `gaps` empty, and the water renderer can use the current row’s gaps to shape/clip the surface band.
