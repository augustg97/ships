#!/usr/bin/env python3
"""Mean RGB in named boxes of the r111 wake diagnosis frames — the same follow-camera
addresses before and after the shader change, so the only variable is the code.
Boxes are in 1440x900 CSS pixels (the capture viewport), scaled by the PNG's own factor.

  "$STUDIO/.venv/bin/python" Research/measure-wake-r111.py before|after
"""
import json, sys
from PIL import Image

# frame -> {box name: (x, y, w, h)} in the 1440x900 viewport
BOXES = {
    'box-az235-d60': {                      # container ship, near-plan from ahead
        'ahead-of-bow':  (690, 570, 60, 60),   # the blob region ahead of her stem
        'wedge-centre':  (690, 240, 60, 60),   # mid-wedge, bars territory
        'arm-line':      (605, 190, 30, 30),   # on the port arm
        'control-sea':   (1000, 500, 60, 60),  # off-wake water
    },
    'gw-before': {                          # steamer, oblique from the quarter
        'ahead-of-bow':  (655, 405, 40, 30),
        'arm-line':      (900, 560, 40, 30),
        'control-sea':   (1100, 300, 60, 40),
    },
    'zhenghe-before': {                     # treasure ship, slow
        'bow-halo':      (640, 425, 40, 30),
        'control-sea':   (950, 250, 60, 40),
    },
}
# after-frames reuse the same boxes under their after- names
ALIAS = {'gw-after': 'gw-before', 'zhenghe-after': 'zhenghe-before',
         'box-az235-d60-after': 'box-az235-d60'}

def mean_rgb(im, box, sc):
    x, y, w, h = [int(v * sc) for v in box]
    px = im.crop((x, y, x + w, y + h)).convert('RGB')
    data = list(px.getdata())
    n = len(data)
    return tuple(round(sum(c[i] for c in data) / n, 1) for i in range(3))

def main():
    import pathlib
    root = pathlib.Path(__file__).resolve().parent.parent / 'build' / 'wake-r111'
    out = {}
    for png in sorted(root.glob('*.png')):
        name = png.stem
        key = ALIAS.get(name, name)
        if key not in BOXES: continue
        im = Image.open(png)
        sc = im.width / 1440
        out[name] = {b: mean_rgb(im, box, sc) for b, box in BOXES[key].items()}
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    main()
