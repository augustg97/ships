precision highp float;

varying vec3 vPos;
varying vec3 vNormalW;

uniform sampler2D uDepth;      // RG = 16-bit elevation, B = roughness
uniform sampler2D uSeaA;       // R = SST, G = log chlorophyll, B = cloud   (month floor)
uniform sampler2D uSeaB;       //                                          (month ceil)
uniform sampler2D uWindA;      // R = u, G = v, B = ice concentration
uniform sampler2D uWindB;
uniform sampler2D uReach;      // R,G = 16-bit hours-to-reach; B = mask
uniform float uMonthMix;
uniform float uTexel;          // 1.0 / depth texture width
uniform vec3  uSun;
uniform vec3  uCam;
uniform float uTime;
uniform float uSeaLevel;       // metres relative to today, for deep time
uniform float uLySeafloor, uLyWind, uLyChl, uLyIce, uLyCloud, uLyReach;

/* ── THE SURFACE OF THE WATER, AND WHY IT IS A FUNCTION OF ZOOM ───────────────────────────
 * uZoom runs 0 at globe scale to 1 with the camera down among the shipping, and uMPP is how
 * many metres of ocean one pixel covers. Together they decide two things this shader used to
 * decide once and for all:
 *
 *  * HOW TRANSPARENT the water is. The note further down explains why the extinction is
 *    deliberately about nine times weaker than real sea water: at globe scale the argument IS
 *    the sea floor, and a physically exact ocean is a black disc with no Mid-Atlantic Ridge in
 *    it. But that same choice, seen from 300 km up over the English Channel, renders 70 m of
 *    water as pale sand — the shelf looked like a beach, because at shelf depths a ninefold
 *    transparency shows almost the whole bottom. The departure is right at one scale and wrong
 *    at the other, so it is now a ramp between them rather than a constant.
 *
 *  * WHICH WAVES EXIST. A 118 m swell is not visible from orbit and cannot be drawn there
 *    without aliasing into static — the mistake this shader already made once at 2600 cycles
 *    per globe. Each component fades in only once a pixel is small compared with its own
 *    wavelength, so the sea grows detail as you descend instead of carrying detail that the
 *    frame cannot resolve.
 *
 * uWave is THE SAME TABLE the Shipwright and the buoyancy code use — direction, wavelength in
 * metres, amplitude in metres. One sea, three views. */
uniform float uZoom;
uniform float uMPP;            // metres of ocean per screen pixel
uniform vec2  uRef;            // lon, lat of the camera's sub-point, radians
uniform vec4  uWave[4];        // dirX, dirZ, wavelength m, amplitude m
uniform float uWind;           // wind speed for the wave state, m/s

const float R_EARTH_M = 6371000.0;

const float PI = 3.14159265359;
const float ELEV_MIN = -11000.0;
const float ELEV_SPAN = 20000.0;

/* position on the unit sphere -> equirectangular uv. Longitude is measured from -180 so that
   u=0 is the antimeridian, matching how the tiles were cut. */
/* ⚠ HANDEDNESS. The convention is x = cos(lat)sin(lon), y = sin(lat), z = cos(lat)cos(lon),
   so that a camera outside the sphere sees NORTH UP and EAST TO THE RIGHT. The first version
   used z = -cos(lat)cos(lon), which is self-consistent, renders a perfectly plausible-looking
   Earth, and is MIRRORED — Cape Town drew to the right of Perth. It was caught by projecting
   two known cities to screen coordinates, not by looking, because a mirrored globe looks
   entirely normal until you name something on it. Change this and lonLatToVec together. */
vec2 sphereUV(vec3 p){
  vec3 n = normalize(p);
  float lon = atan(n.x, n.z);           // -PI .. PI
  float lat = asin(clamp(n.y, -1.0, 1.0));
  return vec2(lon / (2.0*PI) + 0.5, 0.5 - lat / PI);
}

float decodeDepth(vec2 uv){
  vec3 t = texture2D(uDepth, uv).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * ELEV_SPAN + ELEV_MIN;
}
float roughAt(vec2 uv){ return texture2D(uDepth, uv).b; }

/* ── procedural noise, for surface texture below the grid ─────────────── */
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

/* ── A LOCAL METRIC FRAME ───────────────────────────────────────────────────────────────
   Wave phase has to be computed in metres, and metres across a whole globe is a number no
   float32 in a fragment shader can hold: a 27 m chop is 1.5 million cycles around the equator,
   and the phase would quantise into banding long before it drew a wave. So position is measured
   from the camera's own sub-point. Within a few hundred kilometres of it — which is the only
   place waves are ever visible — the numbers stay small and exact, and the frame is a plain
   east/north tangent plane. */
vec2 localMetres(vec3 p){
  vec3 n = normalize(p);
  float lon = atan(n.x, n.z);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float dlon = lon - uRef.x;
  if (dlon >  PI) dlon -= 2.0*PI;
  if (dlon < -PI) dlon += 2.0*PI;
  return vec2(dlon * cos(lat) * R_EARTH_M, (lat - uRef.y) * R_EARTH_M);
}

/* ── THE SEA SURFACE ────────────────────────────────────────────────────────────────────
   Gerstner normals only. The globe is not displaced: a 1.3 m swell on a 6371 km sphere is far
   below one pixel of relief at any zoom this view reaches, and the thing that actually makes
   water look like water at a distance is not its shape but what its SLOPE does to the sun.
   (The Passage view, down among the hulls, uses the same table on a real displaced surface —
   there the shape does matter, and a ship has to sit in it.)

   crest returns how near this point is to the top of a wave, which is where a sea breaks. */
vec3 seaSurface(vec2 pm, float t, out float crest, out float amp){
  vec3 nrmSum = vec3(0.0, 1.0, 0.0);
  crest = 0.0; amp = 0.0;
  for (int i = 0; i < 4; i++){
    float L = uWave[i].z;
    /* the resolution gate: a component appears only once a pixel is small against it */
    float vis = smoothstep(L * 0.34, L * 0.075, uMPP);
    if (vis <= 0.001) continue;
    vec2 d = normalize(uWave[i].xy);
    float A = uWave[i].w * vis;      // wind already folded in by sea.js seaAmp()
    float k = 6.2831853 / L;
    float c = sqrt(9.81 / k);                 // deep water: the same c as sea.js derives
    float ph = k * dot(d, pm) - c * k * t;
    nrmSum.x -= d.x * k * A * cos(ph);
    nrmSum.z -= d.y * k * A * cos(ph);
    crest += sin(ph) * A;
    amp += A;
  }
  return normalize(nrmSum);
}

void main(){
  vec3 n = normalize(vPos);
  vec2 uv = sphereUV(vPos);
  vec3 V = normalize(uCam - vPos);          // toward the eye
  vec3 L = normalize(uSun);

  float elev = decodeDepth(uv) - uSeaLevel;
  float rough = roughAt(uv);

  /* month-interpolated surface fields */
  vec3 seaA = texture2D(uSeaA, uv).rgb, seaB = texture2D(uSeaB, uv).rgb;
  vec3 sea  = mix(seaA, seaB, uMonthMix);
  vec3 wnA  = texture2D(uWindA, uv).rgb, wnB = texture2D(uWindB, uv).rgb;
  vec3 wn   = mix(wnA, wnB, uMonthMix);

  float sst   = sea.r * 34.0 - 2.0;                 // degC
  float chl   = pow(10.0, sea.g * 4.0 - 2.0);       // mg/m3, log-packed
  float cloud = sea.b;
  vec2  wind  = (wn.rg - 0.5019608) * 2.0 * 25.0;   // m/s, packed about 128
  float wspd  = length(wind);
  float ice   = wn.b;

  /* ── the surface normal, from the gradient of the depth field itself ──
     Not a pre-baked hillshade: relief tied to the data means a changing field changes its own
     shading, and it survives any zoom. */
  float e = uTexel;
  float hL = decodeDepth(uv - vec2(e,0.0)), hR = decodeDepth(uv + vec2(e,0.0));
  float hD = decodeDepth(uv - vec2(0.0,e)), hU = decodeDepth(uv + vec2(0.0,e));
  float latScale = max(0.15, cos((0.5 - uv.y) * PI));
  /* The vertical scale of the normal must track the HORIZONTAL size of a texel, or the relief
     changes character every time a new pyramid level binds — flat at level 0, jagged at level 2.
     metresPerTexel / exaggeration keeps the shading scale-consistent across the whole pyramid.
     Exaggeration is ~40x, and it is a stated choice: the sea floor's real gradients are so
     gentle that at 1:1 the largest landform on the planet is invisible. */
  float mPerTexel = uTexel * 40075000.0;
  vec3 grad = vec3((hL - hR) / max(latScale, 0.15), (hD - hU), mPerTexel / 40.0);
  vec3 nrm = normalize(grad);

  /* ══ SUB-TEXEL GROUND ═══════════════════════════════════════════════════════════════════
     ⚠ NO PYRAMID LEVEL CAN FIX A COAST SEEN FROM A KILOMETRE UP. The finest tile set here is
     2.4 km per texel and a pixel at that altitude is under a metre: three thousand pixels
     inside one sample. Loading it would cost 262 MB and still leave the shoreline a smooth
     interpolated curve — the resolution needed is four decades away, and no raster this
     project could ship is going to close it.

     What closes it is the same answer the water already uses: GENERATE the detail below the
     grid, at a frequency the frame can resolve. That is not a decoration over the data, it is
     a truer statement than the smooth curve — a real coastline is fractal at every scale, and
     a smooth one is a claim about the RASTER rather than about the coast.

     Two rules keep it honest:
       * it is ZERO at globe zoom, hard-gated on how many pixels a texel spans, so the shape
         of every coastline at the scale the data actually supports is untouched — and the
         four globe baselines do not move by a single pixel;
       * its amplitude follows the LOCAL SLOPE, so a delta stays flat and a fjord coast gets
         ridges. Uniform noise over everything is how procedural detail announces itself. */
  float texelM = mPerTexel * latScale;
  float subVis = smoothstep(6.0, 40.0, texelM / max(uMPP, 0.001));
  float subH = 0.0;
  vec2 gm = localMetres(vPos);
  if (subVis > 0.002) {
    /* coarse enough to stay above the pixel, fine enough to sit under the texel */
    float L = max(texelM * 0.30, uMPP * 26.0);
    float a = 1.0, f = 1.0, sum = 0.0, norm = 0.0;
    for (int i = 0; i < 3; i++) {
      sum += a * (vnoise(gm * f / L) - 0.5);
      norm += a; a *= 0.5; f *= 2.17;
    }
    subH = sum / max(norm, 1e-4);
    /* ── ⚠ THE AMPLITUDE COMES FROM THE DATA'S VERTICAL VARIATION, NOT ITS SPACING ──
       The first version scaled it by texelM — the HORIZONTAL size of a sample — which on the
       shelf meant a hundred and fifty metres of noise in seventy metres of water. The English
       Channel came out as an archipelago of invented islands, which is a far worse lie than a
       smooth coast.

       What sets how rough a surface is below the grid is how rough it is AT the grid. Take the
       real difference between neighbouring samples and put a fraction of it underneath: a
       fractal surface's variation at half the scale is roughly half. A flat shelf has almost
       no difference between neighbours, so it stays flat and no island appears; a fjord coast
       has hundreds of metres between them, and gets hundreds of metres of ridge. The data
       decides how much detail it is entitled to. */
    float relief = max(abs(hL - hR), abs(hD - hU));
    float amp = relief * 0.35 * subVis;
    subH *= amp;
    /* ── AND THE SHADING PERTURBATION IS DELIBERATELY NOT HERE ──────────────────────
       Three attempts, all kept and all discarded, because the honest result is a negative:
         * in metres-per-metre against a gradient measured in metres-per-two-texels, it
           contributed seven hundredths of one per cent and did nothing;
         * converted correctly into gradient units it came out three times the texel-scale
           slope — true of fractal terrain, and Norway rendered as bubble wrap, because smooth
           value noise has no ridges in it and at full strength you see the noise;
         * capped at 22 per cent of the local gradient it stopped dominating and started
           showing its own LATTICE — square patches at the noise grid, which is a different
           artefact rather than a smaller one.
       Ridged, domain-warped noise would do it, and that is a real piece of work rather than a
       constant to retune. The ELEVATION perturbation below stays, because it earns its place:
       it gives the SHORELINE its heads and inlets, which is what actually reads as
       low-resolution from a few kilometres up, and it is measurably absent at globe zoom. */
  }
  /* ⚠ applied to the ELEVATION, not only to the shading, because the thing that reads as
     low-resolution at this range is the SHORELINE — a smooth arc where there should be heads
     and inlets. Perturbing the height is what gives the land/water boundary its detail; doing
     it in the shading alone leaves a fractal hillside behind a drawn-with-a-compass coast. */
  elev += subH;

  vec3 col;

  if (elev > 0.0) {
    /* ── LAND. Deliberately quiet: this is the ocean's project and the land is the edge it is
       bounded by. Enough relief and material to be legible, never enough to compete. */
    /* Muted by design — SCOPE §3. This is the ocean's project and the land is the edge it is
       bounded by; when the land was brighter than the water the eye went straight to it and
       the sea read as background, which is exactly backwards. */
    float lat = abs(0.5 - uv.y) * 180.0;
    vec3 lowland = vec3(0.150, 0.138, 0.112);
    vec3 upland  = vec3(0.212, 0.196, 0.170);
    col = mix(lowland, upland, clamp(elev / 2600.0, 0.0, 1.0));
    /* snow above a line that falls with latitude, not a flat altitude — so the Andes carry
       snow at 5,000 m and Norway carries it at 1,200, which is what actually happens */
    float snowline = 5200.0 - lat * 58.0;
    float snow = smoothstep(snowline, snowline + 900.0, elev);
    col = mix(col, vec3(0.72, 0.74, 0.78), snow * 0.86);
    float lam = clamp(dot(nrm, normalize(vec3(0.55, 0.55, 0.58))), 0.0, 1.0);
    col *= (0.52 + 0.80 * lam);
    col += (fbm(uv * 2200.0) - 0.5) * 0.020;
  } else {
    /* ── WATER. Composed as: light reaches the floor, is absorbed on the way down and back,
       and what returns is added to the light scattered by the water column itself. */
    float depth = -elev;

    /* the sea floor as a MATERIAL, classified from depth and roughness. A colour ramp is a
       cartographic convention; this is an appearance. */
    vec3 shelfSand  = vec3(0.62, 0.58, 0.44);
    vec3 slopeMud   = vec3(0.34, 0.30, 0.25);
    vec3 abyssClay  = vec3(0.20, 0.19, 0.185);
    vec3 ridgeRock  = vec3(0.26, 0.235, 0.22);

    float fShelf = 1.0 - smoothstep(60.0, 220.0, depth);
    float fSlope = smoothstep(120.0, 400.0, depth) * (1.0 - smoothstep(1600.0, 3000.0, depth));
    float fAbyss = smoothstep(2600.0, 4200.0, depth);
    vec3 floorCol = shelfSand * fShelf + slopeMud * fSlope + abyssClay * fAbyss;
    floorCol = mix(floorCol, ridgeRock, clamp((rough - 0.42) * 2.1, 0.0, 1.0));
    /* abyssal-hill fabric, grown from the process rather than shipped: spreading builds ridges
       parallel to the axis, so the texture is anisotropic and keyed to roughness. Kept at a
       frequency the frame can resolve, for the reason given at the wave scale below. */
    float fab = fbm(vec2(uv.x * 900.0, uv.y * 240.0));
    floorCol *= 0.86 + 0.30 * fab * clamp(rough * 2.4, 0.15, 1.0);
    floorCol *= mix(1.0, 0.30, smoothstep(5800.0, 8200.0, depth));   // trenches go black

    float lamF = clamp(dot(nrm, normalize(vec3(0.5, 0.5, 0.75))), 0.0, 1.0);
    floorCol *= (0.34 + 0.95 * lamF);
    floorCol *= uLySeafloor;

    /* ── HOW MUCH OF THE FLOOR YOU SEE, and a disclosed departure from physics ──
       Real sea water is opaque below about 200 m: a physically exact extinction makes 92% of
       the ocean a flat black plane, and the Mid-Atlantic Ridge — the largest landform on the
       planet — cannot be seen at all. That fails the legibility bar in SCOPE §3.

       So the water is drawn in TWO terms, and the split is the honest part:
         * COLOUR is physical. Per-channel absorption, red gone first, so shallow tropical
           water is turquoise for the reason it really is turquoise.
         * RELIEF is cartographic. The floor's SHADING — not its colour — is carried through
           the whole water column at reduced contrast, so structure below the photic zone is
           still readable. The About panel says so in these words.
       The alternative is a beautiful, accurate, useless black disc. */
    vec3 kv = vec3(0.0026, 0.0016, 0.0011);            // colour transmission, per metre
    kv *= (1.0 + clamp(chl, 0.0, 8.0) * 0.16);         // turbid water absorbs harder
    /* ── AND THE DEPARTURE IS CLOSED AS YOU DESCEND ─────────────────────────────────
       Real Kd for clear ocean water is about 0.04 per metre in red — fifteen times the value
       above. Held at the cartographic figure the shelf reads as sand seen through glass, which
       is what made the Channel look like a beach from 300 km up. Ramping toward physics with
       uZoom means the ridge is still legible from orbit and 70 m of water is opaque from a
       masthead, which is what 70 m of water is. */
    kv *= mix(1.0, 9.0, uZoom * uZoom);
    vec3 through = exp(-kv * depth);

    /* the body of the water: colour set by what is dissolved and suspended in it */
    vec3 clearBlue = vec3(0.016, 0.062, 0.150);
    vec3 deepBlue  = vec3(0.008, 0.030, 0.082);
    vec3 greenish  = vec3(0.046, 0.115, 0.098);
    /* ── ⚠ THE CHLOROPHYLL LAYER SHOWED NOTHING, AND HERE IS WHY ────────────────────
       The data was never the problem: the green channel runs 0–251 across 45% of the frame.
       The MAPPING threw it away. log(chl)*0.28 + 0.60 on open-ocean chlorophyll — around
       0.04 mg/m3 — gives log(0.04)*0.28 + 0.60 = -0.32, which clamps to ZERO. So switching
       the layer on made the open ocean marginally BLUER than the 0.16 default it replaced,
       and only a narrow coastal fringe ever went green. A toggle whose visible effect is to
       remove a little colour is indistinguishable from a toggle that does nothing.

       What it is supposed to show is the ocean's LIVING STRUCTURE, which is one of the great
       patterns of the planet and is invisible from a ship: the subtropical gyres are deserts,
       clearer than distilled water and almost lifeless; the equator, the subpolar seas and
       every eastern-boundary upwelling are green with bloom; and the shelves are greenest of
       all. Those are the fishing grounds, and they explain where fleets went.

       Natural log over a range spanning four decades needs a gentler slope and a lower pivot.
       0.16 of the range now sits at about 0.05 mg/m3 — true open ocean — and a shelf at
       10 mg/m3 reaches the top, so the whole productive structure lies inside the ramp
       instead of clamped off the bottom of it.

       ── ⚠ AND IT STILL SHOWED NOTHING, FOR A SECOND AND DIFFERENT REASON ────────────
       Measured, not guessed: toggling this layer over the mid-Pacific moved 0.16 per cent of
       pixels by a mean of 0.008 of a level. It was a dead switch.

       Two faults, and the ramp was only the first. The rebuilt ramp puts open-ocean water —
       about 0.04 mg/m3, which is most of the ocean and therefore most of the frame — at 0.12,
       while the layer's OFF value is a flat 0.16. The two were tuned to the same number, so
       across the gyres the toggle was a no-op BY CONSTRUCTION.

       The second fault is that the endpoints were a quarter of the distance apart they should
       be. Real ocean colour is not a subtle thing: an oligotrophic gyre is the deepest blue on
       the planet, so clear it is nearly violet and so lifeless it was called a desert before
       anyone could see it from orbit; a coastal bloom is opaque green. Between those two the
       water changes more than almost any other surface on Earth. Painting that difference is
       not a false-colour ramp — it is the colour the water actually is.

       Chlorophyll also changes how FAR you see into the water, not only its hue. Productive
       water is turbid: it scatters more and transmits less, so a bloom reads as milky rather
       than merely green. That is carried by kv above and by the scatter weight below. */
    float g = uLyChl > 0.5
      ? clamp(log(max(chl, 0.004)) * 0.170 + 0.66, 0.0, 1.0)
      : 0.28;
    vec3 body = mix(clearBlue, greenish, g);
    /* the far ends, beyond the ordinary range: desert gyre and true bloom */
    body = mix(body, vec3(0.010, 0.036, 0.132), smoothstep(0.30, 0.02, g) * uLyChl);
    body = mix(body, vec3(0.085, 0.190, 0.115), smoothstep(0.62, 0.97, g) * uLyChl);
    body = mix(body, deepBlue, smoothstep(600.0, 4200.0, depth));   // the open ocean darkens
    body *= mix(0.88, 1.16, clamp((sst + 2.0) / 34.0, 0.0, 1.0));   // warm water reads warmer
    /* turbid water scatters sooner: a bloom is opaque within a few metres, the clearest gyre
       water stays transparent for tens of them. Same term, keyed to the same chlorophyll. */
    float sat = 1.0 - exp(-depth * 0.0042 * (1.0 + clamp(chl, 0.0, 8.0) * 0.22 * uLyChl));
    vec3 scattered = body * sat;

    col = floorCol * through + scattered;

    /* the cartographic relief term: shading only, no colour, and it never lifts the trenches */
    float relief = (lamF - 0.46) * 1.9;
    col *= (1.0 + relief * 0.42 * uLySeafloor * sat);
    /* and a touch of the fabric, so ridge flanks keep their grain at abyssal depth */
    col *= (1.0 + (fab - 0.5) * 0.18 * clamp(rough * 2.2, 0.1, 1.0) * sat * uLySeafloor);

    /* ── the surface: wind-driven roughness, glint and whitecaps ──────── */
    float windDir = atan(wind.y, wind.x);
    vec2 wdir = vec2(cos(windDir), sin(windDir));
    /* Streaks run WITH the wind, stretched along it — that anisotropy is what makes a viewer
       read direction off the water without an arrow.

       ⚠ SCALE. The first version ran at 2600 cycles of noise across the globe, which at globe
       zoom is several cycles per PIXEL: it aliased into television static and the Roaring
       Forties read as a broken screen rather than a breaking sea. Sub-grid detail has to be
       generated at a frequency the frame can actually resolve. */
    /* ── ⚠ SUBTLER, AND MORE CLEARLY WIND ────────────────────────────────────────────
       Those are not opposites, and treating them as one knob was the mistake. What made the
       old field read as noise was not that it was too strong but that it was too ROUND: at
       6.8 : 1 the streaks were short enough to look like static, so the only way to see them
       was to turn the contrast up, which made them look like static more loudly.

       What the eye reads as wind is ELONGATION along a direction, not contrast. At 19 : 1 the
       streaks are unmistakably combed, and the amplitude can then come down by a third — which
       is what "more subtle yet more clearly wind" actually asks for. The second octave runs
       across the first at a shallower angle rather than parallel to it, because a real sea
       surface has the wind streaks of the moment lying over the older ones. */
    vec2 sp = uv * vec2(330.0, 165.0);
    vec2 alongWind = vec2(dot(sp, wdir), dot(sp, vec2(-wdir.y, wdir.x)));
    float drift = uTime * 0.35 * (0.4 + wspd * 0.10);
    float wave = fbm(alongWind * vec2(0.24, 4.55) + vec2(drift, 0.0));
    float wave2 = fbm(alongWind * vec2(0.78, 6.30) - vec2(drift * 1.7, drift * 0.22));

    float windAmp = uLyWind > 0.5 ? clamp(wspd / 14.0, 0.0, 1.2) : 0.0;
    /* amplitude down a third: the elongation above is now carrying the legibility */
    vec3 sn = normalize(n + vec3(
        (wave - 0.5) * 0.036 * windAmp + (wave2 - 0.5) * 0.017 * windAmp,
        (wave2 - 0.5) * 0.030 * windAmp,
        (wave - 0.5) * 0.036 * windAmp));

    /* ── REAL WAVES, ONCE THEY ARE BIG ENOUGH TO SEE ─────────────────────────────────
       Everything above is the WIND FIELD — a monthly climatology painted at about one cycle
       per degree, which is the right frequency for reading the trades and the Roaring Forties
       off a whole hemisphere, and far too coarse to be water. Below is the water: the same
       four-component sea the Shipwright floats hulls on, in metres, appearing component by
       component as the ground scale drops past each wavelength.

       The perturbed normal is rotated out of the tangent plane into world space, because
       everything downstream — glint, Fresnel, the sky term — is in world space and a normal
       that is right in the wrong frame lights the ocean from the wrong side. */
    float crest, wamp;
    vec3 wn = seaSurface(localMetres(vPos), uTime, crest, wamp);
    /* east and north at this point, so the wave frame is the sea's frame */
    vec3 east  = normalize(cross(vec3(0.0, 1.0, 0.0), n));
    vec3 north = cross(n, east);
    float seaVis = step(0.0001, wamp);
    vec3 waveN = normalize(n + (east * wn.x + north * wn.z) * 1.0);
    sn = normalize(mix(sn, normalize(sn + (waveN - n) * 1.35), seaVis));

    /* Sun glint. Blinn-Phong with a wind-broadened lobe: a glassy sea gives one hard highlight,
       a rough sea smears it wider — that difference is what the eye actually reads as "windy".
       ⚠ The exponent floor matters. At shininess 22 with a 2.6x gain the lobe covered most of
       the visible disc and turned the whole Southern Ocean pale grey — it read as land. Keep
       the lobe tight enough that glint stays a glint. */
    vec3 Hv = normalize(L + V);
    float shin = mix(420.0, 70.0, clamp(wspd / 16.0, 0.0, 1.0));
    /* Close in the facets are resolved individually, so the lobe must TIGHTEN rather than
       broaden: from orbit a rough sea is one smeared sheet of glare because a pixel holds a
       million facets, and from a masthead the same sea is thousands of separate sparks. Same
       physics, opposite appearance, and the difference is entirely how much sea is in a pixel. */
    shin = mix(shin, 2400.0, uZoom);
    float spec = pow(clamp(dot(sn, Hv), 0.0, 1.0), shin);
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(sn, V), 0.0, 1.0), 5.0);
    float sunUp = clamp(dot(n, L), 0.0, 1.0);
    col += vec3(1.0, 0.96, 0.88) * spec * (0.40 + 0.55 * windAmp) * sunUp
           * mix(1.0, 5.5, uZoom);
    /* ── THE SKY IS WHAT MAKES WATER LOOK WET ────────────────────────────────────────
       A surface that only reflects the SUN is a dark mirror with a hot spot in it. Water is
       mostly reflecting the dome above it, which is why the sea is blue on a blue day and
       grey under cloud, and why it goes silver toward the horizon where the Fresnel term runs
       to one. Weighted by uZoom because at globe scale you are looking almost straight down,
       where the reflectance of water really is only two per cent. */
    vec3 skyUp = vec3(0.30, 0.46, 0.70), skyHz = vec3(0.62, 0.72, 0.84);
    vec3 skyCol = mix(skyUp, skyHz, pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 2.2));
    skyCol *= (0.34 + 0.80 * sunUp);
    col = mix(col, skyCol, fres * mix(0.34, 0.86, uZoom) * (0.35 + 0.65 * sunUp));

    /* WHITECAPS — the single most legible thing on the frame: the Southern Ocean is white and
       the horse latitudes are glass.

       ⚠ CALIBRATED FOR A MONTHLY MEAN, NOT AN INSTANT. Breaking starts at about force 6
       (11 m/s) in the moment, but this field is a monthly climatology whose peak anywhere on
       Earth is 9–10 m/s. A 9 m/s MEAN in the Southern Ocean is a place where it is blowing a
       gale much of the time. Using the instantaneous threshold on a mean field puts whitecaps
       precisely nowhere, which is what it did. Measured off the shipped field:
         50°S  9.2 m/s (the westerlies)   ·  15°N 7.2 m/s (the north-east trades)
          5°N  3.1 m/s (the doldrums)     ·  40°N 140°W 1.9 m/s (the Pacific high) */
    float breakF = smoothstep(5.2, 10.0, wspd) * uLyWind;
    float foam = smoothstep(0.54 - breakF * 0.22, 0.80, wave2 * 0.55 + wave * 0.45);
    col = mix(col, vec3(0.86, 0.90, 0.94), foam * breakF * 0.70);
    /* and once the individual waves are resolved, foam belongs on the CRESTS of those waves
       rather than in a noise field — a sea breaks at its top, and putting the white anywhere
       else is the tell that the water is a texture and not a surface */
    if (wamp > 0.0001) {
      float ct = crest / max(wamp, 0.0001);                  // -1 trough .. +1 crest
      float lace = fbm(localMetres(vPos) * 0.06 + vec2(uTime * 0.5, 0.0));
      float cf = smoothstep(0.58, 0.94, ct) * smoothstep(0.30, 0.62, lace);
      col = mix(col, vec3(0.90, 0.935, 0.95), cf * (0.20 + 0.62 * breakF) * uZoom);
    }
    /* and a broad haze of spray where it really blows, so the belt reads at globe scale
       rather than only close in */
    col = mix(col, vec3(0.55, 0.64, 0.74), smoothstep(6.8, 10.5, wspd) * 0.16 * uLyWind);

    /* ── SEA ICE, from the measured margin ───────────────────────────── */
    if (uLyIce > 0.5 && ice > 0.02) {
      float ic = smoothstep(0.10, 0.60, ice);
      float floe = fbm(uv * vec2(1700.0, 850.0));
      vec3 iceCol = mix(vec3(0.66, 0.73, 0.79), vec3(0.94, 0.96, 0.98),
                        smoothstep(0.35, 0.75, floe));
      col = mix(col, iceCol, ic);
    }
  }

  /* ── reachability, when a port is selected ───────────────────────────── */
  if (uLyReach > 0.5) {
    vec4 rr = texture2D(uReach, uv);
    if (rr.b > 0.35) {
      float hours = (rr.r * 65280.0 + rr.g * 255.0) / 65535.0 * 9600.0;
      float days = hours / 24.0;
      /* Isochrones every 10 days. Kept as LINES on water rather than a wash over it: a heavy
         tint hides the sea the whole argument is about, and the reader needs both at once —
         the wind belts underneath and the ship's front on top. */
      float band = abs(fract(days / 10.0) - 0.5) * 2.0;
      float line = smoothstep(0.80, 1.0, band);
      vec3 warm = mix(vec3(1.00, 0.87, 0.46), vec3(0.55, 0.24, 0.40),
                      clamp(days / 180.0, 0.0, 1.0));
      col = mix(col, warm, 0.045 + line * 0.62);
    }
  }

  /* ── atmosphere ──────────────────────────────────────────────────────── */
  float sunUpG = clamp(dot(n, normalize(uSun)), 0.0, 1.0);
  /* ══ CLOUD ═══════════════════════════════════════════════════════════════════════════════
     The old layer was one octave of noise multiplied by the cover field and mixed toward flat
     grey. It had no light in it, cast nothing, sat exactly on the ground, and drifted due east
     regardless of the wind — four things that between them make cloud read as a texture printed
     on the map rather than weather standing above an ocean. Four fixes, each doing one job:

     1. PARALLAX. A cloud deck is about 8 km up. On a 6371 km sphere that is a tenth of a per
        cent, which sounds negligible and is the single strongest cue in the frame: toward the
        limb, clouds visibly OVERHANG the edge of the planet and slide against the sea beneath
        them. Sampling the cloud field where the view ray crosses the shell — rather than where
        it hits the ground — is what puts them in the sky.
     2. THE WIND CARRIES THEM. The field already has u and v at every point; advecting the noise
        along it means the Southern Ocean streams east, the trades stream west, and the doldrums
        sit still, without any of that being drawn.
     3. STRUCTURE AT TWO SCALES. Weather systems are hundreds of kilometres and the cells inside
        them are tens. One octave gives cotton wool; a large low-frequency mass carrying a finer
        cellular break-up gives something that reads as organised.
     4. THEY CAST A SHADOW. Cloud over a dark ocean is only half the picture; the other half is
        the sea going darker underneath it, offset toward the anti-solar side. Without it the
        deck floats free of the water.  */
  if (uLyCloud > 0.5) {
    /* where the view ray crosses the cloud shell, expressed as a tangential shift */
    const float CLOUD_KM = 8.0;
    vec3 Vt = V - n * dot(V, n);
    float cosv = max(dot(n, V), 0.06);
    vec3 shifted = normalize(vPos - Vt * (CLOUD_KM / 6371.0) / cosv * length(vPos));
    vec2 cuv = sphereUV(shifted);

    vec3 cA = texture2D(uSeaA, cuv).rgb, cB = texture2D(uSeaB, cuv).rgb;
    float cl = mix(cA.b, cB.b, uMonthMix);
    vec3 wA = texture2D(uWindA, cuv).rgb, wB = texture2D(uWindB, cuv).rgb;
    vec2 cw = (mix(wA, wB, uMonthMix).rg - 0.5019608) * 2.0 * 25.0;

    /* advection: u is eastward (+uv.x), v is northward (-uv.y in an image whose row 0 is +90) */
    vec2 drift = vec2(cw.x, -cw.y) * uTime * 0.00018;
    float sysN = fbm(cuv * vec2(46.0, 23.0) + drift * 46.0);          // weather systems
    float cellN = fbm(cuv * vec2(400.0, 200.0) + drift * 400.0);      // cells inside them
    float dens = cl * (0.42 + 0.86 * sysN) * (0.55 + 0.62 * cellN);
    /* ⚠ ACCURATE COVER IS NOT THE SAME AS USEFUL COVER. July really is 60-70 per cent cloud
       over the North Atlantic, and drawing it at full opacity hid the ocean this whole view
       exists to show. Thin cloud stays thin: the ramp starts later and the opacity is raised
       to a power, so the overcast is still overcast while the broken edges let the sea read
       through them — which is also what thin cloud does. */
    float cover = pow(smoothstep(0.28, 0.86, dens), 1.35);

    /* SHADOW on the sea, thrown toward the anti-solar side and softened by the deck's depth */
    vec3 Lt = L - n * dot(L, n);
    vec3 sh = normalize(vPos + Lt * (CLOUD_KM / 6371.0) / max(dot(n, L), 0.10) * length(vPos));
    vec3 sA = texture2D(uSeaA, sphereUV(sh)).rgb, sB = texture2D(uSeaB, sphereUV(sh)).rgb;
    float shd = smoothstep(0.22, 0.78, mix(sA.b, sB.b, uMonthMix) * (0.5 + 0.8 * sysN));
    col *= 1.0 - shd * 0.30 * sunUpG;

    /* LIGHT. Cloud is close to a white Lambertian sheet, so it is the brightest thing on the
       day side and, unlike the sea, it keeps a little light right through the terminator —
       which is why a real limb has a lit rim of cloud after the ground below has gone dark. */
    float lit = 0.10 + 1.05 * smoothstep(-0.18, 0.42, dot(n, L));
    vec3 top = vec3(0.985, 0.985, 0.985), base = vec3(0.60, 0.645, 0.715);
    vec3 cc = mix(base, top, smoothstep(0.25, 0.85, cover)) * lit;
    /* warm on the terminator, the way sunlit tops look from orbit at the day/night line */
    cc = mix(cc, cc * vec3(1.16, 0.92, 0.78),
             smoothstep(0.34, 0.02, abs(dot(n, L))) * 0.75);
    col = mix(col, cc, cover * 0.93);
  }

  /* ── ONE day/night term, applied once ────────────────────────────────
     It used to be applied twice — once inside the water branch and once here — which is how a
     lit ocean turns into a black disc. Ambient never goes to zero: a night ocean under a moon
     is dark, not absent, and a globe whose far half is pure black reads as a crescent, not a
     planet. */
  float day = smoothstep(-0.26, 0.20, dot(n, normalize(uSun)));
  /* 1.18 on the day side drove the lit hemisphere past white before the gamma even ran */
  col *= mix(0.32, 1.00, day);

  /* limb haze: what makes a globe read as a planet rather than a ball */
  float rim = 1.0 - clamp(dot(normalize(vNormalW), normalize(uCam - vPos)), 0.0, 1.0);
  col += vec3(0.16, 0.30, 0.48) * pow(rim, 3.0) * (0.22 + 0.90 * sunUpG);

  /* ── ⚠ A HARD CLAMP IS WHY THE SUNNY SIDE WAS WASHED OUT ────────────────────────
     clamp(col, 0, 1.4) followed by a gamma gives 1.4^0.4545 = 1.17, which the framebuffer
     clips to flat white — so every value from about 0.75 upward landed on the SAME pixel.
     The sun glint, the bright shelves and the lit limb all became one featureless area.
     Highlights have to ROLL OFF rather than stop: an exponential shoulder compresses the top
     of the range into the last part of the scale instead of throwing it away, which is what
     film does and what an eye does. Nothing is clipped now, so the bright side keeps its
     structure and still reads as bright. */
  col = vec3(1.0) - exp(-max(col, 0.0) * 1.34);
  col = pow(col, vec3(0.4545));                       // to sRGB
  gl_FragColor = vec4(col, 1.0);
}
