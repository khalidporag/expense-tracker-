#!/usr/bin/env python3
"""Regenerates public/icon-192.png and icon-512.png (pure Python, no dependencies).
Mark: a blue ring with an orange dot on the app's near-black, matching the in-app splash.
Full-bleed background so the icon is safe as 'maskable'; the mark stays inside the central safe zone."""
import struct, zlib, os

INK = (20, 22, 26)
RING = (124, 155, 255)
DOT = (255, 154, 92)

def render(size, ss=3):
    c = size / 2
    r_out, r_in, r_dot = size * 0.285, size * 0.20, size * 0.085
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    px, py = x + (sx + 0.5) / ss, y + (sy + 0.5) / ss
                    d2 = (px - c) ** 2 + (py - c) ** 2
                    col = DOT if d2 <= r_dot ** 2 else RING if r_in ** 2 <= d2 <= r_out ** 2 else INK
                    for i in range(3):
                        acc[i] += col[i]
            n = ss * ss
            row += bytes([acc[0] // n, acc[1] // n, acc[2] // n, 255])
        rows.append(bytes(row))
    return b''.join(rows)

def png(size, path):
    def chunk(t, d):
        body = t + d
        return struct.pack('>I', len(d)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(render(size), 9)) + chunk(b'IEND', b''))

here = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
png(192, os.path.join(here, 'icon-192.png'))
png(512, os.path.join(here, 'icon-512.png'))
print('icons written')
