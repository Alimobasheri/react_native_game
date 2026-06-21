#!/usr/bin/env python3
"""Split blocks-variations.webp 2x2 grid, key green chroma, tight-crop each block."""

from __future__ import annotations

import json
import os
import statistics
from collections import deque
from dataclasses import dataclass

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'assets', 'swimmer')
OUT_DIR = os.path.join(SRC_DIR, 'blocks')
META_PATH = os.path.join(SRC_DIR, 'blocks-meta.json')
SOURCE_FILENAME = 'blocks-variations.webp'

TOLERANCE = 40
GRID_COLS = 2
GRID_ROWS = 2
ALPHA_THRESHOLD = 8
FACE_WIDTH_RATIO = 0.85


@dataclass
class BlockVariantMeta:
    name: str
    output: str
    width: int
    height: int
    depth_overlap_px: int
    depth_overlap_ratio: float


def sample_background(rgba: Image.Image) -> tuple[int, int, int]:
    w, h = rgba.size
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    rs, gs, bs = [], [], []
    for x, y in corners:
        r, g, b, _ = rgba.getpixel((x, y))
        rs.append(r)
        gs.append(g)
        bs.append(b)
    return (sum(rs) // 4, sum(gs) // 4, sum(bs) // 4)


def matches_bg(
    r: int,
    g: int,
    b: int,
    bg: tuple[int, int, int],
    tolerance: int = TOLERANCE,
) -> bool:
    return (
        abs(r - bg[0]) <= tolerance
        and abs(g - bg[1]) <= tolerance
        and abs(b - bg[2]) <= tolerance
    )


def flood_remove_background(
    rgba: Image.Image,
    bg: tuple[int, int, int],
    tolerance: int = TOLERANCE,
) -> Image.Image:
    w, h = rgba.size
    px = rgba.load()
    visited = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        idx = y * w + x
        if visited[idx]:
            return
        r, g, b, a = px[x, y]
        if a == 0 or not matches_bg(r, g, b, bg, tolerance):
            return
        visited[idx] = 1
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        if x > 0:
            push(x - 1, y)
        if x < w - 1:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y < h - 1:
            push(x, y + 1)

    return rgba


def global_remove_background(
    rgba: Image.Image,
    bg: tuple[int, int, int],
    tolerance: int = TOLERANCE,
) -> Image.Image:
    w, h = rgba.size
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if matches_bg(r, g, b, bg, tolerance):
                px[x, y] = (r, g, b, 0)
    return rgba


def alpha_bbox(
    rgba: Image.Image,
    threshold: int = ALPHA_THRESHOLD,
) -> tuple[int, int, int, int] | None:
    w, h = rgba.size
    min_x, min_y, max_x, max_y = w, h, -1, -1
    found = False
    for y in range(h):
        for x in range(w):
            if rgba.getpixel((x, y))[3] > threshold:
                found = True
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if not found:
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)


def detect_depth_overlap(
    rgba: Image.Image,
    bbox: tuple[int, int, int, int],
) -> tuple[int, float]:
    """Return depth shadow px and ratio below the block face."""
    bx0, by0, bx1, by1 = bbox
    max_row_count = 0
    row_counts: list[tuple[int, int]] = []
    for y in range(by0, by1):
        count = 0
        for x in range(bx0, bx1):
            if rgba.getpixel((x, y))[3] > ALPHA_THRESHOLD:
                count += 1
        row_counts.append((y, count))
        max_row_count = max(max_row_count, count)

    if max_row_count == 0:
        return 0, 0.0

    face_bottom = by0
    threshold_count = max_row_count * FACE_WIDTH_RATIO
    for y, count in row_counts:
        if count >= threshold_count:
            face_bottom = y

    bbox_height = by1 - by0
    depth_px = max(0, by1 - 1 - face_bottom)
    ratio = depth_px / bbox_height if bbox_height else 0.0
    return depth_px, ratio


def key_and_crop_cell(cell: Image.Image) -> tuple[Image.Image, BlockVariantMeta]:
    cell_bg = sample_background(cell)
    keyed = flood_remove_background(cell.copy(), cell_bg)
    keyed = global_remove_background(keyed, cell_bg, TOLERANCE)
    bbox = alpha_bbox(keyed)
    if bbox is None:
        raise RuntimeError('No visible content after keying cell')

    cropped = keyed.crop(bbox)
    depth_px, depth_ratio = detect_depth_overlap(keyed, bbox)
    cw = bbox[2] - bbox[0]
    ch = bbox[3] - bbox[1]

    return cropped, BlockVariantMeta(
        name='',
        output='',
        width=cw,
        height=ch,
        depth_overlap_px=depth_px,
        depth_overlap_ratio=round(depth_ratio, 6),
    )


def main() -> None:
    source_path = os.path.join(SRC_DIR, SOURCE_FILENAME)
    if not os.path.isfile(source_path):
        raise FileNotFoundError(source_path)

    os.makedirs(OUT_DIR, exist_ok=True)

    rgba = Image.open(source_path).convert('RGBA')
    bg = sample_background(rgba)
    sheet_w, sheet_h = rgba.size
    cell_w = sheet_w // GRID_COLS
    cell_h = sheet_h // GRID_ROWS

    variants: list[BlockVariantMeta] = []
    idx = 0
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            x0 = col * cell_w
            y0 = row * cell_h
            cell = rgba.crop((x0, y0, x0 + cell_w, y0 + cell_h))
            cropped, meta = key_and_crop_cell(cell)
            name = f'block_var_{idx}'
            output_rel = f'blocks/{name}.webp'
            output_path = os.path.join(SRC_DIR, output_rel)
            cropped.save(output_path, 'WEBP', lossless=True, method=6)
            variants.append(
                BlockVariantMeta(
                    name=name,
                    output=output_rel,
                    width=meta.width,
                    height=meta.height,
                    depth_overlap_px=meta.depth_overlap_px,
                    depth_overlap_ratio=meta.depth_overlap_ratio,
                )
            )
            print(
                f'{name}: {meta.width}x{meta.height} '
                f'depth={meta.depth_overlap_px}px ({meta.depth_overlap_ratio:.3f})'
            )
            idx += 1

    depth_ratios = [v.depth_overlap_ratio for v in variants]
    avg_ratio = statistics.mean(depth_ratios)

    payload = {
        'source': SOURCE_FILENAME,
        'grid': {'cols': GRID_COLS, 'rows': GRID_ROWS},
        'bg_rgb': list(bg),
        'variants': [v.__dict__ for v in variants],
        'depth_overlap_ratio': round(avg_ratio, 6),
    }
    with open(META_PATH, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, indent=2)
    print(f'Wrote {META_PATH} depth_overlap_ratio={avg_ratio:.6f}')


if __name__ == '__main__':
    main()
