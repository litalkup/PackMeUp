#!/usr/bin/env python3
"""Generate the PackMeUp app icons.

Pure standard library: the artwork (a suitcase with a tick) is described with
signed distance fields, rendered with 3x3 supersampling and written out as PNG.
Run from the repository root:  python3 tools/make_icons.py
"""

import math
import os
import struct
import zlib

BRAND = (15, 143, 139)        # #0f8f8b
BRAND_DARK = (11, 111, 108)   # #0b6f6c
WHITE = (255, 255, 255)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")


def rounded_rect_sdf(px, py, cx, cy, half_w, half_h, radius):
    """Signed distance to a rounded rectangle. Negative inside."""
    dx = abs(px - cx) - (half_w - radius)
    dy = abs(py - cy) - (half_h - radius)
    outside = math.hypot(max(dx, 0.0), max(dy, 0.0))
    inside = min(max(dx, dy), 0.0)
    return outside + inside - radius


def segment_sdf(px, py, ax, ay, bx, by):
    """Signed distance to a line segment (a capsule spine)."""
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    length_sq = vx * vx + vy * vy
    t = 0.0 if length_sq == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / length_sq))
    return math.hypot(wx - t * vx, wy - t * vy)


def coverage(distance, edge):
    """Anti-aliasing helper: 1 inside, 0 outside, smooth across the edge."""
    if distance <= -edge:
        return 1.0
    if distance >= edge:
        return 0.0
    return (edge - distance) / (2 * edge)


def blend(base, layer, alpha):
    return tuple(round(b + (l - b) * alpha) for b, l in zip(base, layer))


def shade(x, y, maskable):
    """Colour of the icon at unit coordinates (0..1)."""
    # A maskable icon must keep its content inside the middle 80%, so the
    # artwork is scaled down and the background bleeds to the edges.
    if maskable:
        scale = 0.78
        x = 0.5 + (x - 0.5) / scale
        y = 0.5 + (y - 0.5) / scale
        bg_distance = -1.0
    else:
        bg_distance = rounded_rect_sdf(x, y, 0.5, 0.5, 0.5, 0.5, 0.22)

    edge = 0.0035

    # Background: rounded square with a soft vertical gradient.
    top_to_bottom = min(max(y, 0.0), 1.0)
    background = blend(BRAND, BRAND_DARK, top_to_bottom * 0.55)
    alpha = coverage(bg_distance, edge)
    if alpha <= 0:
        return None
    colour = background

    # Suitcase handle: a white bar with a hole in the middle.
    handle_outer = rounded_rect_sdf(x, y, 0.5, 0.285, 0.135, 0.075, 0.055)
    handle_inner = rounded_rect_sdf(x, y, 0.5, 0.30, 0.093, 0.062, 0.035)
    handle = max(handle_outer, -handle_inner)
    colour = blend(colour, WHITE, coverage(handle, edge))

    # Suitcase body.
    body = rounded_rect_sdf(x, y, 0.5, 0.565, 0.345, 0.235, 0.075)
    colour = blend(colour, WHITE, coverage(body, edge))

    # Tick inside the body.
    stroke = 0.042
    tick = min(
        segment_sdf(x, y, 0.365, 0.575, 0.455, 0.665) - stroke,
        segment_sdf(x, y, 0.455, 0.665, 0.645, 0.465) - stroke,
    )
    colour = blend(colour, BRAND, coverage(tick, edge))

    return colour + (round(alpha * 255),)


def render(size, maskable=False, samples=3):
    rows = []
    step = 1.0 / (size * samples)
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0.0
            for sy in range(samples):
                for sx in range(samples):
                    ux = (px * samples + sx + 0.5) * step
                    uy = (py * samples + sy + 0.5) * step
                    pixel = shade(ux, uy, maskable)
                    if pixel is None:
                        continue
                    r += pixel[0] * pixel[3]
                    g += pixel[1] * pixel[3]
                    b += pixel[2] * pixel[3]
                    a += pixel[3]
            n = samples * samples
            if a <= 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes((round(r / a), round(g / a), round(b / a), round(a / n)))
        rows.append(bytes(row))
    return rows


def write_png(path, rows, size):
    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as handle:
        handle.write(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-180.png", 180, False),
        ("icon-maskable-512.png", 512, True),
    ]
    for name, size, maskable in jobs:
        path = os.path.join(OUT_DIR, name)
        write_png(path, render(size, maskable), size)
        print("wrote %s (%d x %d)" % (path, size, size))


if __name__ == "__main__":
    main()
