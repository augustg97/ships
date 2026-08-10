/* ── SUB-TEXEL GROUND: RIDGES, NOT BUBBLE WRAP ────────────────────────────────────────────
 * The elevation raster is 4.9 km per texel and one pixel at a kilometre's altitude is 0.75 m,
 * so between the data and the screen there are three decades with nothing in them. Round 12
 * added generated relief to the water and DELIBERATELY SHIPPED NONE for the ground, because
 * three attempts at it produced, in order: nothing at all, bubble wrap, and a visible lattice.
 * The note kept from that round said ridged domain-warped noise would do it. This is that.
 *
 * ⚠ AND THE REASON THOSE ATTEMPTS FAILED IS THE ONE THING TO GET RIGHT HERE. They perturbed the
 * SHADING — they computed a normal from the raster and then added a wobble to it. A surface's
 * light and dark sides are the gradient of its HEIGHT; a wobble added to the normal afterwards
 * belongs to no height field at all, which is why it read as a texture laid over the ground
 * rather than as ground. Detail goes into the ELEVATION, and the hillshade then differentiates
 * the elevation it is actually drawing. The ridge gets a lit side and a shadowed side because
 * it is a ridge, not because it was painted with one.
 *
 * ⚠ ONE FETCH, APPLIED MANY TIMES. The hillshade differentiates the height over a small
 * stencil. If each tap of that stencil computed its own AMPLITUDE, the gradient would pick up
 * d(amplitude)/dx and report the amplitude's own variation as terrain slope — a slope belonging
 * to nothing. So the amplitude is computed ONCE, at the vertex, and carried in as a constant to
 * every tap. (Learned from the Tectonic Plate Model, whose shader states the same rule for the
 * same reason: it differentiates elevAt over a stencil and had to stop the warp varying across
 * it.)
 *
 * ⚠ AND THE AMPLITUDE IS THE DATA'S VERTICAL VARIATION, NOT ITS HORIZONTAL SPACING. Scaling by
 * texel size put 157 m of invented relief into 70 m of water in round 12 and turned the English
 * Channel into an archipelago. A flat shelf must stay flat and a fjord coast must get ridges,
 * so the amplitude comes from how much the raster itself moves between neighbouring samples.
 */

float ldHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ldNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(ldHash(i),            ldHash(i + vec2(1.0, 0.0)), u.x),
             mix(ldHash(i + vec2(0.0, 1.0)), ldHash(i + vec2(1.0, 1.0)), u.x), u.y);
}

/* A ridged octave: fold the noise about its middle so the maxima become CREASES. Plain value
   noise has round hills and round hollows, which is the bubble wrap; folding it gives lines,
   and a landscape is made of lines — watersheds, spurs, the edges between catchments. */
float ldRidge(vec2 p){ float n = ldNoise(p) * 2.0 - 1.0; return 1.0 - abs(n); }

/* Domain warp: displace the sampling position by another noise field before reading. This is
   what stops the result looking like noise. Straight fbm is isotropic mush; warping it bends
   the creases into the long curved forms that erosion actually leaves, and it is the single
   cheapest step from "texture" to "terrain". */
vec2 ldWarp(vec2 p){
  return p + vec2(ldNoise(p * 0.51 + 4.7), ldNoise(p * 0.53 + 19.3)) * 1.7 - 0.85;
}

/* Four ridged octaves over the warped domain, returned centred on zero. p is in units of the
   coarsest ridge spacing, so the caller sets the scale in metres. */
float ldDetail(vec2 p){
  /* (see ldLand below for the one rule about where this detail is allowed to act) */
  /* ⚠ THREE OCTAVES, NOT FOUR, AND A LONGER BASE. The disc's rings grow geometrically, so at
     five kilometres out the mesh already has hundreds of metres between vertices. An octave
     finer than that cannot be carried by the geometry and comes out as hard triangular facets —
     which is what the first tuning did to the Peloponnese: not terrain, low-poly rock. Detail
     has to stay above the mesh that has to hold it. */
  vec2 q = ldWarp(p);
  float s = 0.0, a = 0.5, w = 0.0;
  for (int i = 0; i < 3; i++) {
    s += a * ldRidge(q);
    w += a;
    q *= 2.13;                 /* not 2.0 — an integer ratio lines the octaves up and that is
                                  the LATTICE the third attempt of round 12 produced */
    a *= 0.52;
  }
  return s / w - 0.55;
}

/* ── ⚠ THE COASTLINE IS DATA; THE DETAIL IS INFERENCE, AND IT MAY NOT REDRAW THE DATA ─────
 * The height the shaders draw, in one place so geometry and shading cannot diverge. Adding
 * amp·ldDetail to the raw raster let the detail change the SIGN of the ground, in both
 * directions. Seaward it can raise a skerry out of water the map says is open — the round-12
 * archipelago, still latent. Landward it sank whole foreshores: e of 5–25 m against ±50 m of
 * detail took the drawn coast below sea level, the vertex clamp flattened it to the water,
 * and the low strip in front of every headland vanished — measured off Cape Malea, where the
 * band between the wedge and the sea rendered as backdrop paper because the ground that
 * should have stood there had been carved away. So: under the sea the detail does nothing at
 * all, and over land the drawn ground keeps at least a quarter of the raster's own height —
 * detail may cut valleys into a coast, it may not delete the coast. */
float ldLand(float e, float amp, vec2 m){
  if (e <= 0.0) return e;
  return max(e + amp * ldDetail(m / 3000.0), e * 0.25);
}
