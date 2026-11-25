import sys
sw, au = sys.argv[1], sys.argv[2]
s = open(sw).read()
a = """    if (kinds.length) how.push('the ' + swAnd(kinds) + ' yards are lowered onto the caps below them');
  }"""
assert s.count(a) == 1
s = s.replace(a, """    if (kinds.length) how.push('the ' + swAnd(kinds) + ' yards are lowered onto the caps below them');
    /* r315 (0y¹⁴⁹): the crossjack is crossed bare, read off the built ship (userData.bare) */
    let bare = false;
    built.traverse(o => { if (o.userData && o.userData.bare) bare = true; });
    if (bare) how.push('the crossjack, the lowest yard on the mizzen, carries no sail');
  }""")
open(sw, 'w').write(s)
t = open(au).read()
b = """            crossjackRead(gf, 'furled');   // r315 (0y¹⁴⁹)
"""
assert t.count(b) == 1
t = t.replace(b, b + """            if (typeof SW_FURLED_CARD === 'function') {
              let nBare = 0; gf.traverse(o => { if (o.isMesh && o.userData.bare) nBare++; });
              const txt2 = SW_FURLED_CARD(v, gf).join(' — ');
              if ((nBare > 0) !== /the crossjack, the lowest yard on the mizzen, carries no sail/.test(txt2))
                say(v.id, 'a furled card that misstates the crossjack', `${nBare} bare crossjack(s) in the furled build: "${txt2.slice(0, 220)}"`);
            }
""")
open(au, 'w').write(t)
print('card + card check applied')
