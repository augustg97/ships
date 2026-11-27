import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
a = """      const lid = new THREE.Mesh(
        new THREE.ExtrudeGeometry(pie, { depth: B * 0.012, bevelEnabled: false }), mats.woodDark);"""
b = """      const lidG = new THREE.ExtrudeGeometry(pie, { depth: B * 0.012, bevelEnabled: false });
      /* sheared with the face's rake, so its inboard corner lies on the face top and bottom (flat, its top corner
         stood 5.6 cm inside the 74's stern) */
      { const pa = lidG.attributes.position, sl = Math.tan(faceLean(zG1));
        for (let i = 0; i < pa.count; i++) pa.setX(i, pa.getX(i) + sl * pa.getZ(i));
        lidG.computeVertexNormals(); }
      const lid = new THREE.Mesh(lidG, mats.woodDark);"""
assert s.count(a) == 1; s = s.replace(a, b); open(p, 'w').write(s); print('ok')
