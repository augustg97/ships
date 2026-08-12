precision highp float;

/* ── THE SHORES OF THE ACTION ─────────────────────────────────────────────────────────────
 * The Action stages a battle at true scale, and at Salamis the battle IS the shore: a strait
 * fourteen hundred metres wide decided the fight, and until this shader the view staged it on
 * open ocean. The ground is a radial disc (the close-up's own trick — vertices dense where the
 * camera lives) displaced by a real DEM patch carried in the battle record: ~30 m per texel,
 * two hundred times finer than the globe's raster, which at 4.9 km per texel does not contain
 * the strait at all.
 *
 * TRUE SCALE, NO LIFT. The globe's near-ground lifts its relief by a stated factor because at
 * chart scale an honest coast vanishes; this view's whole contract is real metres, and from a
 * deck sixteen metres up, a 200 m ridge across a kilometre of water needs no help.
 *
 * The frame is the Action's own: +X is WEST, +Z is NORTH (right-handed with +Y up — the same
 * convention psgFrame and LAND_VERT state, and the reason battle.js had to give up its
 * mirrored left-handed frame the day a real coastline arrived). uDay is the lon/lat of the
 * local origin — fleet 0's anchor for the day — in radians.
 */
varying vec3 vP;
varying vec2 vLL;        /* lon/lat, radians */
varying float vE;        /* true elevation, metres */

uniform sampler2D uShore;
uniform vec4  uB;        /* patch bounds: lon0, lat0, lon1, lat1 — degrees */
uniform vec2  uDay;      /* lon, lat of the local origin, radians */

const float BTL_R = 6371000.0;

float shoreElev(vec2 ll){
  vec2 d = ll * 57.29577951;
  vec2 uv = vec2((d.x - uB.x) / (uB.z - uB.x), (d.y - uB.y) / (uB.w - uB.y));
  if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) return -30.0;
  /* row 0 of the image is the patch's NORTH edge */
  vec3 t = texture2D(uShore, vec2(uv.x, 1.0 - uv.y)).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * 20000.0 - 11000.0;
}

void main(){
  vec3 P = (modelMatrix * vec4(position, 1.0)).xyz;
  float lat = uDay.y + P.z / BTL_R;
  float lon = uDay.x - P.x / (BTL_R * max(0.05, cos(lat)));   /* +X is WEST */
  vLL = vec2(lon, lat);
  float e = shoreElev(vLL);
  vE = e;
  /* the disc already carries the Earth's sagitta in P.y; the land rides on top of it */
  P.y += e;
  vP = P;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
