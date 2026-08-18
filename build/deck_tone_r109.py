# Round 109 — deck tone measurement (rule 4). Samples fixed boxes from the frozen
# captures before and after the covering records landed. Boxes are 16x16 means in
# ORIGINAL frame pixels (2880x1800).
import json, sys
from PIL import Image

BOXES = {
    "ship-yamato": {
        "foredeck (wood fallback -> hinoki)":   (893, 864),
        "amidships deck (wood -> hinoki)":      (1800, 943),
        "aft deck (wood -> hinoki)":            (2074, 936),
        "turret top (control)":                 (1123, 821),
        "hull side (control)":                  (1584, 1008),
    },
    "ship-titanic": {
        "boat deck / house roof (white -> pine)": (1368, 913),
        "forecastle deck (wood -> pine)":         (850, 875),
        "poop deck (wood -> pine)":               (2180, 1000),
        "funnel buff (control)":                  (1152, 749),
        "hull side (control)":                    (1440, 1008),
    },
    "ship-queen-mary-2": {
        "house tier roof (white plate -> teak)":  (1296, 677),
        "upper tier roof aft (white -> teak)":    (1700, 675),
        "hull side (control)":                    (1440, 864),
        "funnel red (control)":                   (1590, 610),
    },
}

def mean_box(img, cx, cy, r=8):
    px = img.load()
    acc = [0, 0, 0]; n = 0
    for x in range(cx - r, cx + r):
        for y in range(cy - r, cy + r):
            p = px[x, y]
            for k in range(3): acc[k] += p[k]
            n += 1
    return [round(a / n) for a in acc]

before_dir, after_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
result = {}
for frame, boxes in BOXES.items():
    b = Image.open(f"{before_dir}/{frame}.png").convert("RGB")
    a = Image.open(f"{after_dir}/{frame}.png").convert("RGB")
    for label, (cx, cy) in boxes.items():
        result[f"{frame}: {label}"] = {"before": mean_box(b, cx, cy), "after": mean_box(a, cx, cy)}
json.dump(result, open(out, "w"), indent=1)
for k, v in result.items():
    print(f"{k}: {v['before']} -> {v['after']}")
