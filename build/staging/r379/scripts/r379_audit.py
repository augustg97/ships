P='Research/audit-hulls.js'; s=open(P).read()
anchor="    /* ── A-CHEEK (round 377): STEEL'S CHEEKS ARE THEIR RECORD"
assert s.count(anchor)==1, 'audit anchor'
block="""    /* ── A-SOLID-OUT (round 379): A CLOSED TIMBER IS WOUND OUTWARD. A builder that sweeps a closed section marks the
       mesh userData.solid. Its signed volume (the sum over its triangles of p0·(p1×p2)/6, times the sign of the mesh's
       world determinant, so a mirrored side counts the same) must be positive. A negative volume means every face's
       front looks INTO the timber: the outer face is culled and a viewer sees the inner face through it. r377's cheeks
       were drawn that way on the 74 and stood unseen under the planking for two rounds; A-CHEEK passed throughout,
       because it reads vertex positions, which were all right. */
    { g.updateMatrixWorld(true);
      g.traverse(o => {
        if (!(o.isMesh && o.userData.solid)) return;
        const P = o.geometry.attributes.position, I = o.geometry.index; if (!I) return;
        let vol = 0;
        for (let t = 0; t + 2 < I.count; t += 3) {
          const a = I.getX(t), b = I.getX(t + 1), c = I.getX(t + 2);
          const ax = P.getX(a), ay = P.getY(a), az = P.getZ(a), bx = P.getX(b), by = P.getY(b), bz = P.getZ(b), cx = P.getX(c), cy = P.getY(c), cz = P.getZ(c);
          vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
        }
        vol *= Math.sign(o.matrixWorld.determinant());
        if (!(vol > 0)) say(v.id, 'a closed timber wound inward', `${(o.userData.part && o.userData.part.key) || o.name}: signed volume ${vol.toFixed(4)} m³`);
      }); }

"""
s=s.replace(anchor, block+anchor); open(P,'w').write(s)
H='web/js/hull.js'; h=open(H).read()
old="        m.userData.headCheek = { which, sgn };"
assert h.count(old)==1, 'solid anchor'
h=h.replace(old, old+" m.userData.solid = true;"); open(H,'w').write(h); print('ok')
