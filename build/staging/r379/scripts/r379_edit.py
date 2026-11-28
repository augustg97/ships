P='web/js/hull.js'; s=open(P).read()
old="""        for (let j = 0; j < 4; j++) { const j1 = (j + 1) % 4; idx.push(a + j, b + j, b + j1, a + j, b + j1, a + j1); }
      }
      { const a = rows[0].base, b = rows[rows.length - 1].base; idx.push(a, a + 2, a + 1, a, a + 3, a + 2, b, b + 1, b + 2, b, b + 2, b + 3); }"""
new="""        /* r379: wound so every face's front looks OUT of the timber. r377 wound them inward, so the outer face was
           culled and a viewer saw the inner face through it, 1 cm under the planking (A-CHEEK-FACE) */
        for (let j = 0; j < 4; j++) { const j1 = (j + 1) % 4; idx.push(a + j, b + j1, b + j, a + j, a + j1, b + j1); }
      }
      { const a = rows[0].base, b = rows[rows.length - 1].base; idx.push(a, a + 1, a + 2, a, a + 2, a + 3, b, b + 2, b + 1, b, b + 3, b + 2); }"""
assert s.count(old)==1, 'winding anchor'
s=s.replace(old,new); open(P,'w').write(s); print('ok')
