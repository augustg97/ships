import sys
P = sys.argv[1]; s = open(P).read()
old = """      const clew = [clewX, deckMax(u, clewU) + Math.max(H.sheer(0.5) * 0.10, B * 0.10)];"""
new = """      /* r319 (0y¹⁵⁶): AND OVER THE CASTLE UNDER IT. deckMax reads the deck, not the castles standing on it,
         so the carrack's clew hung 7.81 m over the water beside a sterncastle whose rail stands at 10.44 m:
         the sheet could only be hauled UP to the poop it is led to. The foot clears the highest castle
         rail under the span from the mast to the clew by half a metre (class: a sheet block's room);
         every hull without a castle there is byte-identical. */
      let castleRail = -Infinity;
      for (let k = 0; k <= 8; k++) {
        const ct = castleTopAt(S, H, Math.max(0, Math.min(1, u + (clewU - u) * k / 8)));
        if (ct) castleRail = Math.max(castleRail, ct.y + ct.railH + 0.5);
      }
      const clew = [clewX, Math.max(deckMax(u, clewU) + Math.max(H.sheer(0.5) * 0.10, B * 0.10), castleRail)];"""
assert s.count(old) == 1; s = s.replace(old, new); open(P, 'w').write(s); print('ok')
