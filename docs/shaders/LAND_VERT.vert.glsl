precision highp float;

/* ── THE NEAR-FIELD GROUND ────────────────────────────────────────────────────────────────
 * The globe sphere is 192 x 128, so one facet is 209 km. At a 195 m eye height the horizon is
 * 50 km away — a QUARTER OF ONE TRIANGLE — and the planet renders as a flat plate with a
 * straight polygon edge for a horizon. No amount of shading fixes that: there is no geometry
 * for a coast to be part of.
 *
 * So the ground gets the same treatment the ocean already has. A radial disc anchored under the
 * camera, in the metre-scale scene, DISPLACED by the real elevation field — which is what makes
 * a coast a coast: not its colour, but its skyline. A headland is a shape against the sky.
 *
 * The disc's rings grow geometrically, so the vertices sit where the pixels are: metres apart
 * alongside the ship, kilometres apart at the rim. Near the camera that is finer than the data,
 * which costs nothing and means the interpolation is the limit rather than the tessellation.
 */
varying vec3 vP;
varying vec2 vLL;
varying float vAmpS;         /* the detail amplitude, computed ONCE here and used by the frag */
varying float vH;            /* the DRAWN height — after the sea-level clamp, exactly what
                                the vertex position used, so the interpolated varying is the
                                interpolated surface. Passing the PRE-clamp height here cut
                                the bottom 135 m off every coastal ramp: it interpolates from
                                a deeply negative sea-side vertex and crosses zero far up a
                                wall whose drawn base the clamp had already put at the water. */

#include "LAND_DETAIL.chunk.glsl"

/* ── ⚠ AND THE LAND IS LIFTED, DELIBERATELY AND BY A STATED FACTOR ───────────────────────
 * On the map a hull is drawn sixty-five kilometres long — a chess piece on a board — because a
 * ship at true scale on a planet is a third of a pixel. The close-up is the other end of that
 * bargain, and it inherits the same problem in reverse: from a deck the horizon is 26 km, so a
 * coast that is real and near and twenty metres high sits exactly ON the horizon and reads as
 * nothing. Zheng He's treasure fleet is the case that showed it.
 * So the ground is lifted. It is not proportional and does not pretend to be — it is the same
 * device a relief globe uses, and for the same reason: at any honest vertical scale the Earth
 * is smooth and its shape cannot be seen. What must stay true is the SHAPE — where the coast
 * runs, which way the ridges lie, which side the light is on — and all of that is preserved,
 * because the lift is a single factor applied to a real field.
 */
uniform float uLandLift;

uniform sampler2D uDepth;
uniform vec2  uAnchor;        // lon, lat of the patch origin, radians
uniform float uSeaLevel;

const float LAND_R_EARTH = 6371000.0;
const float LAND_ELEV_MIN = -11000.0;
const float LAND_ELEV_SPAN = 20000.0;

/* local metres in the (west, up, north) frame -> the globe's equirectangular uv */
vec2 landUV(vec3 p, out vec2 ll){
  float lat = uAnchor.y + p.z / LAND_R_EARTH;
  float cl = max(0.05, cos(lat));
  float lon = uAnchor.x - p.x / (LAND_R_EARTH * cl);   // +X is WEST
  ll = vec2(lon, lat);
  return vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.14159265);
}
float landElev(vec2 uv){
  vec3 t = texture2D(uDepth, fract(uv)).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * LAND_ELEV_SPAN + LAND_ELEV_MIN - uSeaLevel;
}

void main(){
  vec3 P = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 ll;
  vec2 uv = landUV(P, ll);
  float e = landElev(uv);
  vLL = ll;

  /* ── THE AMPLITUDE OF THE INVENTED DETAIL, FROM THE LAND'S OWN VERTICAL VARIATION ──────
     One texel east and one north; the difference is how much this ground actually moves at the
     scale the raster can see. A flat shelf gets nothing and a mountain coast gets a lot, which
     is the rule round 12 arrived at after inventing an archipelago in the English Channel.
     ⚠ AND EVERY SAMPLE CLAMPS TO THE BEACH BEFORE DIFFERENCING. At a shoreline texel the raw
     difference measures the land against the SEABED of the texel beside it — 388 m of
     "variation" on the 121 m headland off Cape Malea, measured, because the Aegean next to it
     is 360 m deep. Bathymetry is not relief; only the land's own movement sets the amplitude.
     Computed HERE, once per vertex, and carried to the fragment — the hillshade differentiates
     the height over a stencil, and an amplitude that varied across that stencil would be read
     as a slope belonging to nothing. */
  float texel = 4900.0 / LAND_R_EARTH;                 /* one raster sample, in radians */
  vec2 llE = ll + vec2(texel / max(0.05, cos(ll.y)), 0.0);
  vec2 llN = ll + vec2(0.0, texel);
  float hE = max(landElev(vec2(llE.x / 6.2831853 + 0.5, 0.5 - llE.y / 3.14159265)), 0.0);
  float hN = max(landElev(vec2(llN.x / 6.2831853 + 0.5, 0.5 - llN.y / 3.14159265)), 0.0);
  float e0 = max(e, 0.0);
  float amp = 0.22 * (abs(hE - e0) + abs(hN - e0));
  float rad = length(P.xz);
  /* the SHADING keeps its ridges at every range the eye can reach — the fragment carries
     detail the mesh cannot, the way the sea carries sub-vertex ripple as normal detail —
     and lets go only out at the descent's rim, where a ridge is under a pixel */
  vAmpS = amp * (1.0 - smoothstep(60000.0, 160000.0, rad));
  /* the GEOMETRY fades far sooner, where the mesh stops being able to carry a 3 km octave:
     ring spacing passes 1.2 km near 34 km out, and displacement past Nyquist is facet
     garbage, not terrain — the low-poly Peloponnese of the first tuning */
  amp *= 1.0 - smoothstep(9000.0, 34000.0, rad);

  /* the detail is in the HEIGHT, not in the shading — see LAND_DETAIL.chunk.glsl.
     ldLand, not a raw sum: the detail must not move the coastline the raster states. */
  vec2 m = vec2(ll.x * cos(ll.y), ll.y) * LAND_R_EARTH;     /* local metres */
  float h = max(ldLand(e, amp, m), 0.0);
  vH = h;

  /* the sagitta is already in the mesh; the elevation rides on top of it */
  P.y += h * uLandLift;
  vP = P;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
