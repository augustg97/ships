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
varying float vElev;
varying vec2 vLL;

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
  vElev = e;
  vLL = ll;
  /* the sagitta is already in the mesh; the elevation rides on top of it */
  P.y += max(e, 0.0);
  vP = P;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
