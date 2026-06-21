#!/usr/bin/env python3
"""Split side-walls.webp into left/right strips, key green chroma, tight-crop."""

from __future__ import annotations

import json
import os
import sys
from collections import deque
from dataclasses import dataclass

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'assets', 'swimmer')
OUT_DIR = os.path.join(SRC_DIR, 'walls')
META_PATH = os.path.join(SRC_DIR, 'side-walls-meta.json')
SOURCE_FILENAME = 'side-walls.webp'

# Flood from edges only — avoids punching holes in rock interior colors.
TOLERANCE = 30
ALPHA_THRESHOLD = 8
CONTENT_COLUMN_THRESHOLD = 0.08
CROP_PAD_PX = 6


@dataclass
class WallMeta:
    name: str
    output: str
    width: int
    height: int
    aspect: float
    source_crop: tuple[int, int, int, int]


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


def is_green_pixel(r: int, g: int, b: int) -> bool:
    return g > 120 and g > r + 40 and g > b + 40


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


def mild_edge_despill(rgba: Image.Image, max_dist: int = 2) -> Image.Image:
    """Clip green spill on the outer 1–2 px only — never touch interior pixels."""
    from scipy import ndimage

    arr = np.array(rgba)
    alpha = arr[..., 3] > 0
    if not alpha.any():
        return rgba
    dist = ndimage.distance_transform_edt(alpha)
    edge = alpha & (dist <= max_dist)
    rgb = arr[..., :3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cap = np.maximum(r, b)
    spill = edge & (g > cap)
    g = np.where(spill, cap, g)
    arr[..., 1] = g
    return Image.fromarray(arr)


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


def content_column_fractions(rgba: Image.Image) -> list[float]:
    arr = np.array(rgba)
    h = arr.shape[0]
    w = arr.shape[1]
    fracs: list[float] = []
    for x in range(w):
        col = arr[:, x, :3]
        non_green = sum(
            1 for r, g, b in col if not is_green_pixel(int(r), int(g), int(b))
        )
        fracs.append(non_green / h)
    return fracs


def find_wall_crops(rgba: Image.Image) -> tuple[tuple[int, int, int, int], tuple[int, int, int, int]]:
    """Return (left_crop_box, right_crop_box) in source pixel coords."""
    w, h = rgba.size
    fracs = content_column_fractions(rgba)
    mid = w // 2

    left_cols = [
        x for x in range(mid) if fracs[x] >= CONTENT_COLUMN_THRESHOLD
    ]
    right_cols = [
        x for x in range(mid, w) if fracs[x] >= CONTENT_COLUMN_THRESHOLD
    ]

    if not left_cols or not right_cols:
        raise RuntimeError('Could not locate left/right wall columns in source art')

    left_box = (
        max(0, left_cols[0] - CROP_PAD_PX),
        0,
        min(w, left_cols[-1] + CROP_PAD_PX + 1),
        h,
    )
    right_box = (
        max(0, right_cols[0] - CROP_PAD_PX),
        0,
        min(w, right_cols[-1] + CROP_PAD_PX + 1),
        h,
    )
    return left_box, right_box


def key_and_crop_strip(
    strip: Image.Image,
    name: str,
    source_crop: tuple[int, int, int, int],
) -> tuple[Image.Image, WallMeta]:
    bg = sample_background(strip)
    keyed = flood_remove_background(strip.copy(), bg)
    keyed = mild_edge_despill(keyed)
    bbox = alpha_bbox(keyed)
    if bbox is None:
        raise RuntimeError(f'No visible content after keying: {name}')
    cropped = keyed.crop(bbox)
    cw = bbox[2] - bbox[0]
    ch = bbox[3] - bbox[1]
    return cropped, WallMeta(
        name=name,
        output=f'walls/{name}.webp',
        width=cw,
        height=ch,
        aspect=cw / ch if ch else 1.0,
        source_crop=source_crop,
    )


def main() -> None:
    source_path = os.path.join(SRC_DIR, SOURCE_FILENAME)
    if not os.path.isfile(source_path):
        print(f'Missing source: {source_path}', file=sys.stderr)
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    rgba = Image.open(source_path).convert('RGBA')
    bg = sample_background(rgba)
    left_box, right_box = find_wall_crops(rgba)

    walls: list[WallMeta] = []
    for crop_box, name in ((left_box, 'side_wall_left'), (right_box, 'side_wall_right')):
        strip = rgba.crop(crop_box)
        cropped, meta = key_and_crop_strip(strip, name, crop_box)
        out_path = os.path.join(OUT_DIR, f'{name}.webp')
        cropped.save(out_path, 'WEBP', lossless=True, method=6)
        walls.append(meta)
        print(
            f'{name}: source_crop={crop_box} '
            f'out={meta.width}x{meta.height} aspect={meta.aspect:.4f}'
        )

    payload = {
        'source': SOURCE_FILENAME,
        'left_crop': list(left_box),
        'right_crop': list(right_box),
        'bg_rgb': list(bg),
        'tolerance': TOLERANCE,
        'walls': [
            {**w.__dict__, 'source_crop': list(w.source_crop)} for w in walls
        ],
    }
    with open(META_PATH, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, indent=2)
    print(f'Wrote {META_PATH}')


if __name__ == '__main__':
    main()
