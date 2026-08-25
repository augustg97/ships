"""Pixel-diff the r151 before/after spin pairs: count changed pixels per bearing and
report the bounding box of the change, to prove the diff is confined to the tower."""
import pathlib, sys
from PIL import Image
import numpy as np

root = pathlib.Path(__file__).parent / "staging"
for ship in ("yamato", "dreadnought"):
    b = root / "r151-before" / f"spin-{ship}"
    a = root / "r151-after" / f"spin-{ship}"
    print(f"== {ship} ==")
    for f in sorted(b.glob("*.png")):
        g = a / f.name
        if not g.exists():
            print(f"  {f.stem}: MISSING after"); continue
        ib = np.asarray(Image.open(f).convert("RGB"), dtype=np.int16)
        ia = np.asarray(Image.open(g).convert("RGB"), dtype=np.int16)
        if ib.shape != ia.shape:
            print(f"  {f.stem}: shape {ib.shape} vs {ia.shape}"); continue
        d = np.abs(ib - ia).max(axis=2) > 8
        n = int(d.sum())
        if n == 0:
            print(f"  {f.stem}: identical"); continue
        ys, xs = np.nonzero(d)
        print(f"  {f.stem}: {n} px of {d.shape[1]}x{d.shape[0]}, "
              f"x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}")
