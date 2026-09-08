precision highp float;
varying vec2 vUv; varying vec3 vN;
uniform float uPanels;      // number of 24-inch cloths across this sail
uniform vec3 uSun;
/* r284 (0y⁸⁹): the reef bands. uReefOn is 0 on every sail whose record answers nothing — a uniform a material
   does not set reads 0 in three.js, so a sail built without these stays byte-identical. uReefAt holds up to
   three bands' rows (0 the head, 1 the foot), uReefN how many of them are live, uReefW the band's half-width
   in metres, uReefPitch the number of reef points across the sail, uSailM the cloth's width and drop in metres. */
uniform float uReefOn; uniform vec3 uReefAt; uniform float uReefN; uniform float uReefW; uniform float uReefPitch; uniform vec2 uSailM;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
void main(){
  /* panels run parallel to the leech; the seam is a doubled, stitched band about an inch wide */
  float p = vUv.x * uPanels;
  float seam = smoothstep(0.030, 0.075, abs(fract(p) - 0.5) * 2.0);
  /* ── SAILCLOTH IS NOT WHITE ─────────────────────────────────────────────────────────
     Unbleached flax is a grey-buff, and a working sail is darker still: tanned or oiled
     against rot on many rigs, and everywhere stained by salt, spray, tar from the rigging
     above it and smoke from the galley funnel. New white canvas exists for about one voyage.
     The old value here was 0.815 — near paper — which is most of why these read as bedsheets
     rather than as gear. */
  vec3 flax = vec3(0.680, 0.640, 0.545);
  float weather = noise(vUv * vec2(9.0, 5.0)) * 0.5 + noise(vUv * vec2(38.0, 21.0)) * 0.5;
  /* ── THE WEAVE ─────────────────────────────────────────────────────────────────────
     Flax canvas is a coarse cloth and at close range you see the threads: warp one way, weft
     the other, at different pitches because they are different yarns. Without it the sail is a
     painted surface; with it, it is woven. */
  float warp = sin(vUv.x * 900.0) * 0.5 + 0.5;
  float weft = sin(vUv.y * 640.0) * 0.5 + 0.5;
  float weave = (warp * 0.55 + weft * 0.45);
  vec3 col = flax * (0.86 + 0.20 * weather) * (0.965 + 0.035 * weave);
  /* ── AND IT IS DIRTIEST WHERE IT IS HANDLED ─────────────────────────────────────────
     Staining is not uniform. It accumulates at the FOOT, which takes the spray and which the
     crew hauls on, and inward from the LEECHES, which are gathered and gripped every time the
     sail is furled or reefed. vUv.y runs 0 at the head to 1 at the foot. */
  float low   = smoothstep(0.35, 1.0, vUv.y);
  float side  = 1.0 - smoothstep(0.0, 0.22, min(vUv.x, 1.0 - vUv.x));
  float grime = max(low * 0.55, side * 0.35) * (0.5 + 0.5 * weather);
  col = mix(col, col * vec3(0.80, 0.77, 0.72), grime);
  col *= mix(1.10, 1.0, seam);                       // the seam is thicker, so it catches light
  /* ── THE REEF BAND (r284, 0y⁸⁹) ───────────────────────────────────────────────────────
     A strip of doubled cloth sewn across the sail at the row the record gives, tabled along both
     edges, with a row of eyelets worked through it at the reef points' pitch. It reads three ways
     on a plate: the band itself is thicker and catches light as the panel seams do; its two
     tablings are stitched lines a shade darker than the cloth; and each eyelet is a small dark
     ring, the pitch of the points. Hurley's plate of Endurance's topsail shows all three at 0.40
     of the leech. The eyelets sit at (k + 0.5) / uReefPitch across the cloth, the stations the
     reef points (geometry, in the rig builder) hang from. */
  if (uReefOn > 0.5) {
    for (int b = 0; b < 3; b++) {
      if (float(b) >= uReefN) break;
      float at = b == 0 ? uReefAt.x : (b == 1 ? uReefAt.y : uReefAt.z);
      float dv = (vUv.y - at) * uSailM.y;                                   // metres from the band's centre line
      float band = 1.0 - smoothstep(uReefW - 0.02, uReefW + 0.02, abs(dv));
      col *= mix(1.0, 1.07, band);                                          // doubled cloth: thicker, catches light
      float tab = 1.0 - smoothstep(0.008, 0.022, abs(abs(dv) - uReefW));    // the tablings' stitched edges
      col *= mix(1.0, 0.82, tab);
      float du = (fract(vUv.x * uReefPitch) - 0.5) / uReefPitch * uSailM.x;   // metres from the nearest eyelet
      float ring = length(vec2(du, dv));
      float eye = (1.0 - smoothstep(0.030, 0.046, ring)) * smoothstep(0.010, 0.020, ring);
      col *= mix(1.0, 0.55, eye);
    }
  }
  /* ── CANVAS IS TRANSLUCENT, and that is half of why a sail reads as fabric ──────────
     A sail lit from behind GLOWS, and the spars and rigging in front of it show through as
     dark bars. A shell that only reflects can never look like cloth however it is shaped,
     because cloth's defining optical property is that light gets through it. Wet-and-strained
     canvas passes perhaps 12%; here the back face is lit by the same sun as the front. */
  float back = max(0.0, dot(-normalize(vN), normalize(uSun)));
  col += flax * pow(back, 1.6) * 0.42;
  /* bolt-rope and tabling darken the edges */
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  col *= mix(0.78, 1.0, smoothstep(0.0, 0.035, edge));
  /* ── LIGHTING CLOTH IS NOT LIGHTING A SOLID ────────────────────────────────────────
     abs(dot(N, L)) lights both faces identically, which is why the sails looked like painted
     shells: a solid has a lit side and a dark side, and canvas has neither. What it has is

     TRANSMISSION. Light passes THROUGH the cloth, so the shadowed face is lit by whatever is
     behind it — and lit warmly, because the fibres scatter long wavelengths further. A backlit
     sail is the brightest thing on a ship and it glows amber, not white.

     SUBSURFACE FALLOFF. The wrap term below is Lambert pushed past the terminator, which is
     what any thin scattering material does: there is no hard shadow line on a sail because the
     light does not stop at 90°, it bleeds round.

     AND NO SPECULAR AT ALL. Flax has no gloss. Every highlight the old shader gave it was a
     lie about the material, and highlights are exactly what the eye uses to decide something
     is hard. */
  vec3 N = normalize(vN);
  vec3 Ldir = normalize(uSun);
  float front = max(0.0, dot(N, Ldir));
  float backl = max(0.0, dot(-N, Ldir));
  float wrap  = max(0.0, (dot(N, Ldir) + 0.55) / 1.55);     // scattering past the terminator
  vec3 warm = vec3(1.06, 0.96, 0.80);                       // transmitted light runs amber
  col = col * (0.30 + 0.62 * wrap)                          // ambient + wrapped diffuse
      + col * warm * pow(backl, 1.35) * 0.80                // what comes THROUGH the cloth
      + col * front * 0.14;                                 // and the little that bounces off
  gl_FragColor = vec4(pow(clamp(col,0.0,1.4), vec3(0.4545)), 1.0);
}
