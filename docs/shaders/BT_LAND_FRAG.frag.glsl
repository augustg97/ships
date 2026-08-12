precision highp float;

/* A coast lit by the Action's own sky. The normal is the gradient of the height field the
 * vertex stage actually drew — the LAND_DETAIL rule, held to here even though the detail is
 * all real: differentiate the height, never wobble a normal.
 *
 * ⚠ THE PALETTE IS DATA. The shore block names its ground cover (veg), battle.js resolves
 * the name in SHORE_PALS, and these uniforms carry the set. r84 shipped the Gravelines DEM
 * wearing Attic phrygana and limestone because the palette lived here as constants — one
 * coast's dress hardcoded onto every coast to come.
 *
 * ⚠ ONE ATMOSPHERE. The Action's fog is FogExp2(0xa9bcc6, 0.00042) and every hull in the scene
 * fades by three.js's own squared-exponent law. The ground must fade by the SAME law to the
 * SAME colour, or a headland at two kilometres floats in front of the haze that has already
 * swallowed the fleet under it. */
varying vec3 vP;
varying vec2 vLL;
varying float vE;

uniform sampler2D uShore;
uniform vec4  uB;
uniform vec3  uSun;
uniform vec3  uCam;
uniform vec3  uFogC;
uniform float uFogD;
uniform vec3  uVegLo;   /* vegetation, the sparse end of the patchiness   */
uniform vec3  uVegHi;   /* vegetation, the dense end                      */
uniform vec3  uRock;    /* the steep-ground material — limestone, chalk   */
uniform vec3  uShoreC;  /* the waterline band — beach sand, wet shingle   */
uniform vec2  uRockS;   /* slope where rock takes over: smoothstep lo/hi  */
uniform vec3  uBare;    /* bare-summit band: lo m, hi m, strength         */
uniform float uShoreHi; /* the waterline band's upper edge, metres        */

const float BTL_R = 6371000.0;

float shoreElevF(vec2 ll){
  vec2 d = ll * 57.29577951;
  vec2 uv = vec2((d.x - uB.x) / (uB.z - uB.x), (d.y - uB.y) / (uB.w - uB.y));
  if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) return -30.0;
  vec3 t = texture2D(uShore, vec2(uv.x, 1.0 - uv.y)).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * 20000.0 - 11000.0;
}

float hashB(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoiseB(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hashB(i), hashB(i + vec2(1,0)), u.x),
             mix(hashB(i + vec2(0,1)), hashB(i + vec2(1,1)), u.x), u.y);
}

void main(){
  /* underwater ground belongs to the SEA's picture, not this one. The sea patch rides with
     the camera and ends at 2.1 km; beyond it, seabed fragments drawn here painted a darker
     water than the sea's own haze and turned the patch edge into a hard line across the
     strait. Discarded, the background — the same horizon colour the sea fades to — owns
     every water pixel past the patch, exactly as it did before the shore existed, and the
     land above it still stands. The -1 m skirt keeps the waterline seam closed inshore. */
  if (vE < -1.0) discard;
  float dist = length(vP - uCam);
  /* the stencil follows the ground one pixel covers: the data is ~30 m, so never finer */
  float stepM = max(30.0, dist * 0.02);
  float cl = max(0.05, cos(vLL.y));
  vec2 dE = vec2(stepM / (BTL_R * cl), 0.0);
  vec2 dN = vec2(0.0, stepM / BTL_R);
  float hE = max(shoreElevF(vLL + dE), 0.0), hW = max(shoreElevF(vLL - dE), 0.0);
  float hN = max(shoreElevF(vLL + dN), 0.0), hS = max(shoreElevF(vLL - dN), 0.0);
  /* +X is WEST: d(height)/dX runs against longitude, so the east sample carries the +x sign */
  vec3 nrm = normalize(vec3((hE - hW) / (2.0 * stepM), 1.0, -(hN - hS) / (2.0 * stepM)));

  /* the named palette: vegetation on the gentle ground, the rock material where the slope
     passes its own threshold, a waterline band where the ground meets the sea */
  float e0 = max(vE, 0.0);
  float slope = 1.0 - nrm.y;                       /* 0 flat .. ~1 cliff */
  float g1 = vnoiseB(vP.xz * 0.011);               /* vegetation patchiness, ~90 m */
  float g2 = vnoiseB(vP.xz * 0.09);                /* ground grain, ~11 m */
  vec3 veg = mix(uVegLo, uVegHi, g1);
  vec3 col = mix(veg, uRock, smoothstep(uRockS.x, uRockS.y, slope));
  col = mix(col, uRock * 1.06, smoothstep(uBare.x, uBare.y, e0) * uBare.z);
  col = mix(uShoreC, col, smoothstep(0.8, uShoreHi, e0));
  col *= 0.88 + 0.24 * g2;

  /* underwater ground: wet dark rock, so the seabed seen through a wave trough is not beige */
  col = mix(vec3(0.10, 0.14, 0.13), col, smoothstep(-1.5, 0.8, vE));

  /* lit by the Action's sun and its overcast sky — a fixed ambient, a real lambert */
  float lam = clamp(dot(nrm, normalize(uSun)), 0.0, 1.0);
  col *= (0.46 + 0.72 * lam);

  /* the Action's own fog law: squared exponent, the hulls' and the background's */
  float f = 1.0 - exp(-uFogD * uFogD * dist * dist);
  col = mix(col, uFogC, f);

  gl_FragColor = vec4(col, 1.0);
}
