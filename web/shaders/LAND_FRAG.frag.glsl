precision highp float;

/* Shaded from the same palette the globe's land branch uses, so the near ground and the
   backdrop beyond it are the same country rather than two different ones meeting at a seam.
   The normal comes from the elevation field's own gradient, in metres, which is what gives a
   ridge its light and dark side. */
varying vec3 vP;
const vec3 HORIZON_C = vec3(0.360, 0.470, 0.585);
varying vec2 vLL;
varying float vAmpS;
varying float vH;
uniform float uLandLift;

#include "LAND_DETAIL.chunk.glsl"
#include "ATMO.chunk.glsl"

uniform sampler2D uDepth;
uniform vec2  uAnchor;
uniform float uSeaLevel;
uniform vec3  uSun;
uniform vec3  uCam;
uniform float uMPP;

const float LAND_R_EARTH = 6371000.0;
const float LAND_ELEV_MIN = -11000.0;
const float LAND_ELEV_SPAN = 20000.0;

float hashL(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoiseL(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hashL(i), hashL(i + vec2(1,0)), u.x),
             mix(hashL(i + vec2(0,1)), hashL(i + vec2(1,1)), u.x), u.y);
}

float rasterAtLL(vec2 ll){
  vec2 uv = vec2(ll.x / 6.2831853 + 0.5, 0.5 - ll.y / 3.14159265);
  vec3 t = texture2D(uDepth, fract(uv)).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * LAND_ELEV_SPAN + LAND_ELEV_MIN - uSeaLevel;
}
/* ⚠ THE HILLSHADE DIFFERENTIATES A HEIGHT FIELD, NEVER A WOBBLED NORMAL — that is the rule
   round 12 paid for three times. Within 9 km field and mesh are the same thing. Beyond, the
   rings grow past what a 3 km octave needs and the GEOMETRY has to let the detail go — but
   the shading keeps it, exactly as the sea keeps sub-vertex ripple as normal detail: still
   the gradient of a real height field (raster plus detail at the vertex's own amplitude,
   lifted by the same factor), just finer than the mesh under it can carry. Before this
   split, every coast past 34 km — which is most coasts seen from a deck — shaded the bare
   4.9 km raster and rendered as a smooth featureless ramp. */
float elevAtLL(vec2 ll){
  vec2 m = vec2(ll.x * cos(ll.y), ll.y) * LAND_R_EARTH;
  return ldLand(rasterAtLL(ll), vAmpS, m) * uLandLift;
}

void main(){
  /* ── THE DRAWN SURFACE DECIDES WHAT IT IS; THE MAP DECIDES ONLY WHERE SURFACES EXIST ──
     Two discards were tried and each opened its own seam of backdrop paper at the
     waterline. Testing the interpolated VERTEX height left notches at the foot of the
     Kyushu coast — a land triangle at forty kilometres spans more than a kilometre, and
     its interpolated zero crosses a long way from the raster's. Testing a per-fragment
     RESAMPLE of the map put a hole through every steep coastal face: a lifted headland's
     front wall hangs over a map footprint a few metres wide, so half the wall's fragments
     re-read "sea" and discarded the wall they were standing on, and the grazing ray went
     on through to the paper. So: a fragment is ground if the geometry drew it above the
     water (vH, the DRAWN height — see LAND_VERT for why it must be the post-clamp value)
     OR the map says the column under it is land (eF, the beach the clamp flattened to sea
     level). Only where both say water does the sea — which discards on the same raster,
     from its rest position — own the pixel. The two rules partition every pixel between
     them; nothing is left to the paper. */
  float eF = rasterAtLL(vLL);
  if (vH <= 0.0 && eF <= 0.0) discard;       // the sea patch owns this pixel

  float dist = length(vP - uCam);
  /* gradient in metres, from the same field, at a step that follows the ground scale */
  /* ⚠ and the stencil has to be FINE ENOUGH TO SEE THE DETAIL. 120 m was set for a 4.9 km
     raster; against 1.5 km ridges and their octaves it would average the whole thing away and
     report the smooth field again. The distance term is the other side of the same coin: far
     ground gets a stencil about as wide as the ground one pixel covers, so the finest octave
     averages out instead of speckling. */
  float stepM = max(max(22.0, uMPP * 1.5), dist * 0.006);
  float cl = max(0.05, cos(vLL.y));
  vec2 dE = vec2(stepM / (LAND_R_EARTH * cl), 0.0);
  vec2 dN = vec2(0.0, stepM / LAND_R_EARTH);
  float hE = elevAtLL(vLL + dE), hW = elevAtLL(vLL - dE);
  float hN = elevAtLL(vLL + dN), hS = elevAtLL(vLL - dN);
  vec3 nrm = normalize(vec3(-(hE - hW) / (2.0 * stepM), 1.0, -(hN - hS) / (2.0 * stepM)));

  /* the globe's own land palette — quiet, because this is the ocean's project */
  float latDeg = abs(vLL.y) * 57.29578;
  vec3 lowland = vec3(0.150, 0.138, 0.112);
  vec3 upland  = vec3(0.212, 0.196, 0.170);
  vec3 col = mix(lowland, upland, clamp(eF / 2600.0, 0.0, 1.0));
  float snowline = 5200.0 - latDeg * 58.0;
  col = mix(col, vec3(0.72, 0.74, 0.78), smoothstep(snowline, snowline + 900.0, eF) * 0.86);

  /* sub-texel grain, at a frequency the frame can resolve — the same reasoning as the sea */
  float g = vnoiseL(vP.xz / max(90.0, uMPP * 22.0));
  col *= 0.90 + 0.20 * g;

  /* ── ⚠ AND IT HAS TO BE LIT THE WAY THE BACKDROP IS LIT ──────────────────────────
     The first version shaded straight from the real sun and wrote the result out LINEAR, with
     no tone curve — so a hillside at 0.2 went to the framebuffer as 0.2, which is 51 of 255.
     The identical value on the globe becomes 115, because the globe rolls off, gammas, and
     then applies an S-curve. The near ground rendered as a black silhouette against a lit
     sea: not so much a lighting bug as two different pictures in one frame.

     The globe's land takes its RELIEF from a fixed key — so a ridge reads at any hour — and
     its BRIGHTNESS from the day/night term. Same here, same numbers, same ending, so the near
     ground and the country behind it are the same country. */
  vec3 L = normalize(uSun);
  float lam = clamp(dot(nrm, normalize(vec3(0.55, 0.58, 0.55))), 0.0, 1.0);
  col *= (0.52 + 0.80 * lam);

  /* ── ⚠ ONE ATMOSPHERE, OR THE HORIZON CAN NEVER JOIN ────────────────────────────────
     The ground hazed toward a pale blue-grey over 90 km while the water beside it hazed toward
     a dark blue over a distance derived from the SHIP'S LENGTH — so the sea went flat and dark
     within a kilometre of the hull while a coast thirty kilometres off stayed bright, and the
     two met along a hard line. Nothing else in the close-up broke the sense of one world as
     completely. Both surfaces now extinguish over the same 38 km toward the same colour, which
     is the sky's own near-horizon value — and the hour arrives afterwards, as the one factor
     the sky and the sea also apply, so a night coast is a moonlit coast against a moonlit
     sky rather than a black strip under a noon one. See ATMO.chunk.glsl. */
  col = mix(col, HORIZON_C, 1.0 - exp(-dist / 38000.0));
  col *= atmoBright(uSun);
  col = vec3(1.0) - exp(-max(col, 0.0) * 0.98);
  col = pow(col, vec3(0.4545));
  col = clamp((col - 0.46) * 1.26 + 0.46, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
