#!/usr/bin/env python3
"""Remove solid corner backgrounds from swimmer UI WebP exports."""

from __future__ import annotations

import json
import os
from collections import deque
from dataclasses import dataclass

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'assets', 'swimmer')
OUT_DIR = os.path.join(SRC_DIR, 'transparent')
META_PATH = os.path.join(SRC_DIR, 'ui-asset-meta.json')

TOLERANCE = 32


@dataclass
class SpriteMeta:
    name: str
    source: str
    output: str
    bg_rgb: tuple[int, int, int]
    sheet_width: int
    sheet_height: int
    cols: int
    rows: int
    frame_width: int
    frame_height: int
    total_frames: int


SPRITE_SHEETS: dict[str, dict[str, int]] = {
    'tap-cursor-sprite.webp': {
        'cols': 4,
        'rows': 3,
    },
}

SPRITE_CHROMA_TOLERANCE = 56


@dataclass
class AssetMeta:
    name: str
    source: str
    output: str
    bg_rgb: tuple[int, int, int]
    width: int
    height: int
    content_x: int
    content_y: int
    content_width: int
    content_height: int
    content_aspect: float


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


def is_magenta_chroma(
    r: int,
    g: int,
    b: int,
    bg: tuple[int, int, int] | None = None,
) -> bool:
    """Remove magenta export backgrounds and their anti-aliased fringe."""
    if r > 235 and g > 235 and b > 235:
        return False
    # Keep warm near-white hand pixels.
    if r > 205 and g > 165 and b > 205 and g > r * 0.72:
        return False
    if bg and matches_bg(r, g, b, bg, SPRITE_CHROMA_TOLERANCE):
        return True
    rb_avg = (r + b) / 2
    if rb_avg < 70:
        return False
    if g < rb_avg * 0.82 and b > 75 and r > 75 and (r + b) > g * 2.5:
        return True
    return False


def global_remove_background(
    rgba: Image.Image,
    bg: tuple[int, int, int],
    tolerance: int = TOLERANCE,
) -> Image.Image:
    """Remove all pixels matching the key color, including enclosed pockets."""
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


def remove_magenta_fringe(
    rgba: Image.Image,
    bg: tuple[int, int, int] | None = None,
) -> Image.Image:
    w, h = rgba.size
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_magenta_chroma(r, g, b, bg):
                px[x, y] = (r, g, b, 0)
    return rgba


def key_image_cell(cell: Image.Image) -> Image.Image:
    """Key one sprite cell using its own corner background sample."""
    cell_bg = sample_background(cell)
    keyed = flood_remove_background(cell.copy(), cell_bg)
    keyed = global_remove_background(keyed, cell_bg, SPRITE_CHROMA_TOLERANCE)
    return remove_magenta_fringe(keyed, cell_bg)


def key_sprite_sheet(
    rgba: Image.Image,
    bg: tuple[int, int, int],
    cols: int,
    rows: int,
) -> Image.Image:
    """Key each grid cell independently so late frames keep clean corners."""
    sheet_w, sheet_h = rgba.size
    frame_w = sheet_w // cols
    frame_h = sheet_h // rows
    keyed = rgba.copy()

    for row in range(rows):
        for col in range(cols):
            x0 = col * frame_w
            y0 = row * frame_h
            x1 = x0 + frame_w
            y1 = y0 + frame_h
            cell = rgba.crop((x0, y0, x1, y1))
            keyed_cell = key_image_cell(cell)
            keyed.paste(keyed_cell, (x0, y0))

    # Final pass for any sheet-level fringe not caught per cell.
    return remove_magenta_fringe(keyed, bg)


def flood_remove_background(rgba: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    w, h = rgba.size
    px = rgba.load()
    visited = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        idx = y * w + x
        if visited[idx]:
            return
        r, g, b, a = px[x, y]
        if a == 0 or not matches_bg(r, g, b, bg):
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


def alpha_bbox(rgba: Image.Image, threshold: int = 8) -> tuple[int, int, int, int] | None:
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


def process_sprite_sheet(filename: str, grid: dict[str, int]) -> SpriteMeta:
    source_path = os.path.join(SRC_DIR, filename)
    base = os.path.splitext(filename)[0]
    output_name = f'{base}.webp'
    output_path = os.path.join(OUT_DIR, output_name)

    image = Image.open(source_path)
    rgba = image.convert('RGBA')
    bg = sample_background(rgba)
    cols = grid['cols']
    rows = grid['rows']
    keyed = key_sprite_sheet(rgba, bg, cols, rows)

    sheet_w, sheet_h = rgba.size
    frame_w = sheet_w // cols
    frame_h = sheet_h // rows

    keyed.save(output_path, 'WEBP', lossless=True, method=6)

    return SpriteMeta(
        name=base.replace('-', '_'),
        source=filename,
        output=f'transparent/{output_name}',
        bg_rgb=bg,
        sheet_width=sheet_w,
        sheet_height=sheet_h,
        cols=cols,
        rows=rows,
        frame_width=frame_w,
        frame_height=frame_h,
        total_frames=cols * rows,
    )


def process_file(filename: str) -> AssetMeta:
    source_path = os.path.join(SRC_DIR, filename)
    base = os.path.splitext(filename)[0]
    output_name = f'{base}.webp'
    output_path = os.path.join(OUT_DIR, output_name)

    image = Image.open(source_path)
    rgba = image.convert('RGBA')
    bg = sample_background(rgba)
    keyed = flood_remove_background(rgba.copy(), bg)
    bbox = alpha_bbox(keyed)
    if bbox is None:
        raise RuntimeError(f'No visible content after keying: {filename}')

    keyed.save(output_path, 'WEBP', lossless=True, method=6)
    cw = bbox[2] - bbox[0]
    ch = bbox[3] - bbox[1]

    return AssetMeta(
        name=base.replace('-', '_'),
        source=filename,
        output=f'transparent/{output_name}',
        bg_rgb=bg,
        width=rgba.width,
        height=rgba.height,
        content_x=bbox[0],
        content_y=bbox[1],
        content_width=cw,
        content_height=ch,
        content_aspect=cw / ch if ch else 1,
    )


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    files = sorted(
        f
        for f in os.listdir(SRC_DIR)
        if f.endswith('.webp') and not f.startswith('.')
    )
    metas: list[AssetMeta] = []
    sprite_metas: list[SpriteMeta] = []
    for f in files:
        if f in SPRITE_SHEETS:
            sprite_metas.append(process_sprite_sheet(f, SPRITE_SHEETS[f]))
        else:
            metas.append(process_file(f))
    payload = {
        'tolerance': TOLERANCE,
        'assets': [meta.__dict__ for meta in metas],
        'sprites': [meta.__dict__ for meta in sprite_metas],
    }
    with open(META_PATH, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, indent=2)
    for meta in metas:
        print(
            f'{meta.source} -> {meta.output} '
            f'content={meta.content_width}x{meta.content_height} '
            f'aspect={meta.content_aspect:.3f}'
        )
    for meta in sprite_metas:
        print(
            f'{meta.source} -> {meta.output} '
            f'grid={meta.cols}x{meta.rows} '
            f'frame={meta.frame_width}x{meta.frame_height} '
            f'frames={meta.total_frames}'
        )


if __name__ == '__main__':
    main()
