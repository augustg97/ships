precision highp float;
/* ── THE WEATHER DECK, IN THE SHELL'S OWN LIGHT ──────────────────────────────────────────
   The deck loft was the last MeshStandardMaterial surface in the hull's envelope: scene-lit
   through ACES while the shell beside it, the terrace walls and risers all take HULL_FRAG's
   one-sun recipe — the same two-lighting-models-on-one-surface fault round 102 measured at
   216 vs 89 sRGB on Azzam's parapet. So this is the shell's closing recipe (sun, sky, water
   bounce, the same gamma, the same normal convention) on a covering term, sharing the hull
   material's own uSun/uCam uniform objects so the deck cannot drift from the ship it caps.

   The covering is METRIC and in HULL space (vO): planks run parallel to the centreline at
   uPlankW metres with seams at (n + 1/2)·uPlankW either side of it, so one plank — the king
   plank — straddles the centreline, which is how a laid deck is actually begun. Butts stagger
   per plank so no two neighbours break together. The margin plank is the waterway MESH at the
   deck edge, not this shader. Plank dimensions are class defaults below what any plate can
   resolve; the part card says so. */
varying vec3 vN; varying vec3 vP; varying vec3 vO;
uniform vec3 uSun, uCam, uCol;
uniform float uMode;     // 0 = bare timber, 1 = laid planks, 2 = painted steel
uniform float uPlankW;   // plank width, metres
uniform float uButtL;    // plank length between butts, metres
uniform float uPlankRun; // 0 = planks run fore-and-aft (the king plank on the centreline), 1 = athwartships

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vP);
  vec3 L = normalize(uSun);
  vec3 col = uCol;

  /* metres per pixel ≈ dist · 2·tan(17°)/1500 px for the 34° lens — the screen footprint
     every covering-scale term fades against (the r106 moiré rule: a sub-pixel feature is
     not a feature, it aliases; fade it to its mean and the far field holds its tone) */
  float mpp = length(uCam - vP) * 4.1e-4;

  if (uMode > 0.5 && uMode < 1.5) {
    /* laid planking */
    /* ── THE RUN IS THE RECORD'S (round 216): a deck laid ATHWARTSHIPS (the Bremen cog,
       Westphal: 'querbeplankt' over fore-and-aft beams) has its seams across the ship and
       its butts along the beams; the across-plank coordinate is x and the along-plank one
       is z. Fore-and-aft (every other hull, uPlankRun 0) is byte-identical. */
    float acrossC = mix(abs(vO.z), vO.x, uPlankRun);   // across the planks
    float alongC  = mix(vO.x, vO.z, uPlankRun);        // along them
    float sp = acrossC / uPlankW;                // seams at half-integers: king plank at 0
    float pi = floor(sp + 0.5);                  // plank index outward from the king plank
    float side = sign(mix(vO.z, 1.0, uPlankRun) + 0.001);   // port and starboard stagger independently
    float bu = alongC / uButtL + hash(vec2(pi * 7.3, side * 13.7));
    float seg = floor(bu + 0.5);
    /* seam and butt distances in METRES, so the caulk is ~10 mm on any ship */
    float dSeam = abs(fract(sp) - 0.5) * uPlankW;
    float dButt = abs(fract(bu) - 0.5) * uButtL;
    float seam = smoothstep(0.004, 0.011, dSeam);
    float butt = smoothstep(0.005, 0.013, dButt);
    /* each plank is its own tree, sawn on its own day: tone per plank and per length */
    float tone = 0.90 + 0.20 * hash(vec2(pi * 3.1, seg * 5.7));
    float grain = noise(vec2(alongC * 7.0, pi * 31.7)) * 0.6
                + noise(vec2(alongC * 55.0, pi * 12.3)) * 0.4;
    /* ⚠ A SUB-PIXEL SEAM IS NOT A SEAM, IT IS MOIRÉ. At the fleet views a 90 mm plank
       covers well under a pixel and the seam field aliases into broad swirling arcs the
       first capture showed clearly. What a real laid deck does at that distance is read
       as a near-uniform warm field — so every plank-scale term fades out as the plank's
       screen footprint collapses, which is the surface's own LOD, not a cheat.
       fwidth needs an ES-1.00 extension pragma the checker (rightly) refuses, so the
       footprint comes from the camera distance above — a soft fade does not need it
       exact. */
    float plankPx = uPlankW / max(mpp, 1e-5);
    float res = clamp(plankPx * 0.5 - 1.0, 0.0, 1.0);   // 0 below 2 px, full from 4 px
    seam = mix(1.0, seam, res);
    butt = mix(1.0, butt, res);
    tone = mix(1.0, tone, res);
    grain = mix(0.5, grain, res);
    col = uCol * tone * (0.86 + 0.24 * grain);
    col = mix(vec3(0.050, 0.045, 0.040), col, min(seam, butt));   // payed seams
  } else if (uMode > 1.5) {
    /* painted working steel: flush-welded, so no drawn seams — what shows is the plate
       patchwork, each repainted on its own docking, and a quiet non-slip grit. The
       plates are metres wide and hold at any range this app views a ship from; the
       3 cm grit is sub-pixel long before that and takes the fade. */
    vec2 cell = floor(vec2(vO.x / 6.0, vO.z / 2.2));
    col *= 0.96 + 0.10 * (hash(cell * 2.7) - 0.5);
    float gritRes = clamp((0.033 / max(mpp, 1e-5)) * 0.5 - 1.0, 0.0, 1.0);
    col *= 0.965 + 0.035 * mix(0.5, noise(vec2(vO.x * 30.0, vO.z * 30.0)), gritRes);
  } else {
    /* bare timber — the hollowed log, the lashed platform: no laid deck to draw.
       The tool-mark noise is ~17 cm and fades the same way. */
    float barRes = clamp((0.17 / max(mpp, 1e-5)) * 0.5 - 1.0, 0.0, 1.0);
    col *= 0.90 + 0.20 * mix(0.5, noise(vec2(vO.x * 6.0, vO.z * 6.0)), barRes);
  }

  float lam = max(dot(N, L), 0.0);
  float sky = 0.5 + 0.5 * N.y;
  float bounce = max(0.0, -N.y) * 0.30;
  vec3 lit = col * (0.24 * sky + 0.95 * lam) + col * bounce * vec3(0.34, 0.52, 0.62);
  vec3 Hv = normalize(L + V);
  float specK = uMode > 1.5 ? 0.16 : 0.09;       // oiled wood sheens broader than paint
  float spec = pow(max(dot(N, Hv), 0.0), 22.0) * specK;
  lit += vec3(1.0, 0.97, 0.90) * spec * lam;
  gl_FragColor = vec4(pow(clamp(lit, 0.0, 1.6), vec3(0.4545)), 1.0);
}
