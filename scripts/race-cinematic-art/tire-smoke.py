"""Bake eight original, local-only RGBA tire-smoke frames.

The moving shapes are layered elliptical eddies with deterministic multi-scale
turbulence. The runtime uses one frame at a time on each pooled wheel particle.
"""
from __future__ import annotations

import hashlib
import math
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/assets/effects/race/v1"
SIZE = 128


def png_chunk(kind: bytes, data: bytes) -> bytes:
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))


def write_png(path: Path, pixels: bytes) -> None:
    scanlines = b"".join(b"\x00" + pixels[y * SIZE * 4:(y + 1) * SIZE * 4] for y in range(SIZE))
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
        + png_chunk(b"IDAT", zlib.compress(scanlines, 9))
        + png_chunk(b"IEND", b"")
    )


def render(frame: int) -> bytes:
    phase = frame / 8 * math.tau
    eddies = []
    for index in range(7):
        seed = index * 2.39996 + phase
        eddies.append(
            (
                -0.43 + index * 0.145 + 0.07 * math.sin(seed * 1.7),
                0.21 * math.sin(seed * 1.21) + 0.05 * math.cos(seed * 2.1),
                0.29 + 0.045 * math.sin(seed * 1.43),
                0.26 + 0.045 * math.cos(seed * 1.79),
                0.39 + 0.11 * math.sin(seed * 1.91) ** 2,
            )
        )
    pixels = bytearray(SIZE * SIZE * 4)
    for y in range(SIZE):
        py = (y + 0.5 - SIZE / 2) / (SIZE / 2)
        for x in range(SIZE):
            px = (x + 0.5 - SIZE / 2) / (SIZE / 2)
            field = 0.0
            for cx, cy, rx, ry, strength in eddies:
                dx = (px - cx) / rx
                dy = (py - cy) / ry
                field += strength * math.exp(-1.35 * (dx * dx + dy * dy))
            waviness = (
                0.11 * math.sin(px * 11.3 + py * 7.1 + phase * 1.7)
                + 0.08 * math.sin(px * 19.4 - py * 12.7 - phase * 2.3)
                + 0.045 * math.sin(px * 37.1 + py * 29.3 + phase * 3.2)
            )
            density = max(0.0, field * (1 + waviness) - 0.06)
            fade = max(0.0, 1 - (px * px + py * py) ** 1.4)
            alpha = round(245 * min(1.0, density * 2.15) * fade)
            shade = round(183 + 38 * min(1.0, density) + 10 * math.sin(px * 8 + phase))
            offset = (y * SIZE + x) * 4
            pixels[offset:offset + 4] = bytes(
                (max(0, min(255, shade)), max(0, min(255, shade + 3)), max(0, min(255, shade + 8)), alpha)
            )
    return bytes(pixels)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="kicklab-tire-smoke-") as temporary:
        for frame in range(8):
            source = Path(temporary) / f"tire-smoke-{frame:02d}.png"
            destination = OUT / f"tire-smoke-{frame:02d}.webp"
            write_png(source, render(frame))
            subprocess.run(["cwebp", "-quiet", "-q", "82", str(source), "-o", str(destination)], check=True)
            print(f"{destination.relative_to(ROOT)} {destination.stat().st_size} {hashlib.sha256(destination.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
