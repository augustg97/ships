import sys
p = sys.argv[1]; s = open(p).read()
a = """          yardLowerRead(gf, 'furled');  // r314
"""
b = """          /* r314 (0y¹⁴⁶): the furled card says the yards are lowered exactly when the furled build lowers one */
          {
            const nLow = yardLowerRead(gf, 'furled');
            if (typeof SW_FURLED_CARD === 'function') {
              const txt = SW_FURLED_CARD(v, gf).join(' — ');
              if ((nLow > 0) !== /yards are lowered onto the caps/.test(txt))
                say(v.id, 'a furled card that misstates the lowered yards', `${nLow} yard(s) lowered in the furled build: "${txt.slice(0, 220)}"`);
            }
          }
"""
assert s.count(a) == 1; s = s.replace(a, b); open(p, 'w').write(s); print('ok')
