precision highp float;

/* Shaded from the same palette the globe's land branch uses, so the near ground and the
   backdrop beyond it are the same country rather than two different ones meeting at a seam.
   The normal comes from the elevation field's own gradient, in metres, which is what gives a
   ridge its light and dark side. */
varying vec3 vP;
varying float vElev;
varying vec2 vLL;

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

float elevAtLL(vec2 ll){
  vec2 uv = vec2(ll.x / 6.2831853 + 0.5, 0.5 - ll.y / 3.14159265);
  vec3 t = texture2D(uDepth, fract(uv)).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * LAND_ELEV_SPAN + LAND_ELEV_MIN - uSeaLevel;
}

void main(){
  if (vElev <= 0.0) discard;                 // the sea patch owns this pixel

  /* gradient in metres, from the same field, at a step that follows the ground scale */
  float stepM = max(120.0, uMPP * 6.0);
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
  vec3 col = mix(lowland, upland, clamp(vElev / 2600.0, 0.0, 1.0));
  float snowline = 5200.0 - latDeg * 58.0;
  col = mix(col, vec3(0.72, 0.74, 0.78), smoothstep(snowline, snowline + 900.0, vElev) * 0.86);

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

  /* distance haze, so the near ground joins the backdrop instead of ending at it */
  float dist = length(vP - uCam);
  float haze = 1.0 - exp(-dist / 90000.0);
  col = mix(col, vec3(0.60, 0.66, 0.74), haze * 0.70);

  float day = smoothstep(-0.26, 0.20, L.y);
  col *= mix(0.32, 1.00, day);
  col = vec3(1.0) - exp(-max(col, 0.0) * 0.98);
  col = pow(col, vec3(0.4545));
  col = clamp((col - 0.46) * 1.26 + 0.46, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
