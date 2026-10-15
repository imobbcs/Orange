#!/usr/bin/env python3
"""Turn the hero state-word renders (letters on pure black) into transparent webp.

Usage: python3 scripts/state-images.py cold.png kalt.png mild.png hot.png heiss.png

Each file name (without extension) becomes public/states/<name>.webp.
Black becomes transparent ("unscreen"): alpha comes from the brightest channel and
colour is un-premultiplied, so the result looks the same as a screen blend over the
page background, wherever it sits. Output is trimmed to the letters and scaled to
1500px wide.
"""
import os
import sys

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'states')
WIDTH = 1500


def unscreen(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255.0
    # Lift near-black noise to true black so the edges vanish cleanly.
    floor = 0.035
    rgb = np.clip((rgb - floor) / (1 - floor), 0, 1)
    a = rgb.max(axis=2)
    safe = np.where(a > 0, a, 1)[..., None]
    col = np.clip(rgb / safe, 0, 1)
    out = np.dstack([col, a])
    img = Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')
    box = img.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    if box:
        pad = 24
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad))
        img = img.crop(box)
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    return img


def main(paths):
    os.makedirs(OUT, exist_ok=True)
    for p in paths:
        name = os.path.splitext(os.path.basename(p))[0].lower()
        dest = os.path.join(OUT, name + '.webp')
        img = unscreen(p)
        img.save(dest, 'WEBP', quality=86, method=6)
        print(f'{dest}  {img.width}x{img.height}  {os.path.getsize(dest) // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
