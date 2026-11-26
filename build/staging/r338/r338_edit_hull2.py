"""r338: the inboard sheets of a well bulwark and its closed doors are drawn to be seen from the deck; say so. usage: <dir>"""
import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
reps = [
("""        g.add(new THREE.Mesh(geo, inward ? inMat : outMat));
      }
    }
    group.add(tag(g, 'wellBulwark', w.name + ' bulwark'));""",
"""        const sheet = new THREE.Mesh(geo, inward ? inMat : outMat);
        if (inward) sheet.userData.facesInboard = true;   // seen from the well deck (A-STRIP-FACES, r338)
        g.add(sheet);
      }
    }
    group.add(tag(g, 'wellBulwark', w.name + ' bulwark'));"""),
("""            door.userData.washPort = { well: w.name, u: p.u, doors: 'closed', side: sgn };""",
"""            door.userData.washPort = { well: w.name, u: p.u, doors: 'closed', side: sgn };
            if (inward) door.userData.facesInboard = true;"""),
]
for a, b in reps:
    assert s.count(a) == 1, (s.count(a), a[:60]); s = s.replace(a, b)
open(p, 'w').write(s); print('inboard sheets marked', p)
