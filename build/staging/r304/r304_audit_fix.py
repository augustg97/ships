p = '/Users/augustgweon/Ships/Research/audit-hulls.js'; s = open(p).read()
a = """        const d = new THREE.Vector3(0, 1, 0);
        for (let it = 0; it < 60; it++) d.set(xx * d.x + xy * d.y + xz * d.z, xy * d.x + yy * d.y + yz * d.z, xz * d.x + yz * d.y + zz * d.z).normalize();"""
b = """        /* r304: the power iteration starts OFF every axis. Started at (0, 1, 0), an exactly level yard (xy = yz = 0
           to the last bit, Endurance's fore topsail yard once her fore became the tallest lower mast) left y an
           eigenvector of its own covariance, and the iteration stayed on it: the yard's 'axis' came out vertical and
           its slings radius 6.17 m. The other yards escaped only on 1e-13 of rounding noise. */
        const d = new THREE.Vector3(0.31, 0.89, 0.33).normalize();
        for (let it = 0; it < 60; it++) d.set(xx * d.x + xy * d.y + xz * d.z, xy * d.x + yy * d.y + yz * d.z, xz * d.x + yz * d.y + zz * d.z).normalize();"""
assert s.count(a) == 2, s.count(a)
open(p, 'w').write(s.replace(a, b)); print('audit PCA start fixed')
