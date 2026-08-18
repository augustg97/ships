#!/usr/bin/env python3
"""Mean RGB in named boxes of the r112 consort-wake frames — the same follow-camera
addresses on the r111 tree (:8151 worktree) and the working tree, so the only variable
is the code. Boxes are in 1440x900 CSS pixels, scaled by the PNG's own factor.

The boxes sit ON THE CONSORT'S WAKE in the after frame, which is unmarked water in the
before frame — that difference IS the round. Controls sit off every wake and must not
move.

  "$STUDIO/.venv/bin/python" Research/measure-wake-r112.py
"""
import json, sys
from PIL import Image

# frame stem -> {box name: (x, y, w, h)} in the 1440x900 viewport
BOXES = {
    'zhenghe': {                            # treasure fleet, 4.3 kn over 70 m
        'consort-wake':  (885, 350, 45, 35),   # the fan abaft the starboard consort
        'consort-churn': (865, 385, 30, 25),   # white water at her stern
        'hero-wake':     (745, 380, 40, 35),   # the subject's own fan — must not move
        'control-sea':   (1050, 560, 60, 40),  # off both wakes
    },
    'madagascar': {                         # voyaging canoe pair, 6.0 kn over 19 m
        'consort-wake':  (800, 380, 40, 35),   # the fan abaft the right-hand canoe
        'control-sea':   (1000, 520, 60, 40),
    },
}

def mean_rgb(im, box, sc):
    x, y, w, h = [int(v * sc) for v in box]
    px = im.crop((x, y, x + w, y + h)).convert('RGB')
    data = list(px.getdata())
    n = len(data)
    return tuple(round(sum(c[i] for c in data) / n, 1) for i in range(3))

def main():
    import pathlib
    root = pathlib.Path(__file__).resolve().parent.parent / 'build' / 'wake-r112'
    out = {}
    for stem, boxes in BOXES.items():
        for side in ('before', 'after'):
            png = root / f'{stem}-{side}.png'
            if not png.exists(): continue
            im = Image.open(png)
            sc = im.width / 1440
            out[f'{stem}-{side}'] = {b: mean_rgb(im, box, sc) for b, box in boxes.items()}
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    main()
