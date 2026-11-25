import sys
H, A = sys.argv[1], sys.argv[2]
s = open(H).read()
a = """        const sT2 = Math.sin(TRIM), cT2 = Math.cos(TRIM), w2 = yardLen * 0.48;
        sails.push(makeFurl("""
b = """        const sT2 = Math.sin(TRIM), cT2 = Math.cos(TRIM), w2 = yardLen * 0.48;
        /* r316 (0y¹⁵⁰): the roll records the yard it is bent to. A lowered upper topsail yard now rests 1.1 m over the
           fixed lower topsail yard, so two rolls lie within reach of each yard, and only the record says which is whose */
        const onYard = fm => { fm.userData.onYard = { x: +ym.position.x.toFixed(3), y: +yY.toFixed(3), mast: mi }; return fm; };
        sails.push(onYard(makeFurl("""
assert s.count(a) == 1; s = s.replace(a, b)
a = """                      + 'the yard before the mast.' } }));"""
assert s.count(a) == 1; s = s.replace(a, """                      + 'the yard before the mast.' } })));""")
open(H, 'w').write(s)
s = open(A).read()
a = """              const pts = YF.hullPts(o); const fc = new THREE.Vector3(); for (const q of pts) fc.add(q); fc.divideScalar(pts.length); furlsF.push({ c: fc, pts }); } });"""
assert s.count(a) == 1
s = s.replace(a, """              const pts = YF.hullPts(o); const fc = new THREE.Vector3(); for (const q of pts) fc.add(q); fc.divideScalar(pts.length); furlsF.push({ c: fc, pts, on: o.userData.onYard || null }); } });""")
a = """              const rolls = furlsF.filter(f => Math.abs(f.c.y - c.y) <= 1.5 && Math.abs(f.c.x - c.x) <= 1.5 && Math.abs(f.c.z - c.z) <= 1.5);
              if (yd.bare) continue; """
assert s.count(a) == 1, s.count(a)
s = s.replace(a, """              /* r316 (0y¹⁵⁰): a roll that records its yard (userData.onYard) is read against that yard only. A lowered upper
                 topsail yard rests 1.1 m over the fixed lower topsail yard, and the 1.5 m reach gave each yard both rolls */
              const rolls = furlsF.filter(f => Math.abs(f.c.y - c.y) <= 1.5 && Math.abs(f.c.x - c.x) <= 1.5 && Math.abs(f.c.z - c.z) <= 1.5
                && (!f.on || (Math.abs(f.on.y - c.y) <= 0.05 && Math.abs(f.on.x - c.x) <= 0.05)));
              if (yd.bare) continue; """)
open(A, 'w').write(s); print('ok')
