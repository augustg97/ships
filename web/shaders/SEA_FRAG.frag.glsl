precision highp float;
varying vec3 vP; varying vec2 vUv; varying vec3 vN; varying float vCrest;
uniform vec3 uSun, uCam; uniform float uTime, uWind, uScale;

/* ── ⚠ THE NEAR-FIELD OCEAN WAS PAINTING OVER THE LAND ────────────────────────────────────
   This surface is drawn after a depth clear, so it covers everything behind it — and it is a
   260 km disc. Following a carrack eleven kilometres off the Spanish coast, the coast was
   simply not there: an empty horizon in the Gulf of Cádiz, because the water is opaque and
   knows nothing about where it ends.

   Water ends at the shore. The patch now samples the SAME elevation field the globe draws
   from, converts each fragment's local metres back to a longitude and latitude, and discards
   itself over land — so the globe's own terrain shows through from behind, in the same frame,
   at whatever resolution the backdrop has. Nothing is drawn twice and nothing is faked: the
   coastline in the near field IS the coastline on the map, because it is the same number.

   uShore fades the last stretch to nothing rather than cutting it, so a beach reads as a beach
   instead of as a polygon edge. */
uniform sampler2D uDepth;      // the globe's elevation field — RG is 16-bit elevation
uniform vec2  uAnchor;         // lon, lat of the patch's origin, RADIANS
uniform float uSeaLevel;       // metres relative to today, for deep time
uniform float uHasDepth;       // 0 in the Shipwright, where there is no globe behind the water

const float SEA_R_EARTH = 6371000.0;
const float SEA_ELEV_MIN = -11000.0;
const float SEA_ELEV_SPAN = 20000.0;

/* local metres in the (west, up, north) frame -> the globe's equirectangular uv */
vec2 seaUV(vec3 p, out float coslat){
  float lat = uAnchor.y + p.z / SEA_R_EARTH;
  coslat = max(0.05, cos(lat));
  float lon = uAnchor.x - p.x / (SEA_R_EARTH * coslat);   // +X is WEST, so longitude decreases
  return vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.14159265);
}
float seaElevAt(vec3 p){
  float cl;
  vec2 uv = seaUV(p, cl);
  vec3 t = texture2D(uDepth, fract(uv)).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * SEA_ELEV_SPAN + SEA_ELEV_MIN - uSeaLevel;
}
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.07; a*=0.5;} return v; }

void main(){
  if (uHasDepth > 0.5) {
    float e = seaElevAt(vP);
    if (e > 0.0) discard;                      // this is land: let the globe behind show
  }
  vec3 V = normalize(uCam - vP);
  vec3 L = normalize(uSun);
  float dist = length(vP.xz - uCam.xz);

  /* ── RIPPLE ON TOP OF SWELL ────────────────────────────────────────────────────────
     The Gerstner sum in the vertex shader carries the waves the geometry can afford to
     resolve. Everything finer than a vertex spacing has to arrive as normal detail, and it
     is what makes water read as water rather than as vinyl: capillary ripple riding on the
     back of every swell, fading out with distance so the horizon does not boil. */
  vec2 rp = vP.xz * 0.42;
  float drift = uTime * 0.30;
  float r1 = fbm(rp + vec2(drift, drift * 0.4));
  float r2 = fbm(rp * 2.9 - vec2(drift * 1.7, 0.0));
  float rippleFade = 1.0 - smoothstep(uScale * 0.6, uScale * 5.0, dist);
  float rs = (0.10 + 0.030 * uWind) * rippleFade;
  vec3 N = normalize(vN + vec3((r1 - 0.5) * rs, 0.0, (r2 - 0.5) * rs));

  /* ── WATER COLOUR IS TRANSMITTED, NOT REFLECTED ────────────────────────────────────
     Deep water is dark because almost nothing comes back. What little does is the blue-green
     that survives longest in seawater — red is gone within a few metres. */
  vec3 deep = vec3(0.014, 0.048, 0.086);
  vec3 shal = vec3(0.036, 0.116, 0.146);
  vec3 body = mix(shal, deep, clamp(dist / (uScale * 8.0), 0.0, 1.0));

  /* ── SUBSURFACE SCATTER ON THE BACK OF A WAVE ──────────────────────────────────────
     A wave lit from behind glows green through its crest, because the water there is thin
     and lit from the far side. It is the single most recognisable thing about a real sea and
     no amount of reflection substitutes for it. Strongest where the face is steep and rising. */
  float back = max(0.0, dot(-N, L));
  float rise = smoothstep(0.0, 0.9, vCrest);
  body += vec3(0.055, 0.185, 0.130) * pow(back, 1.6) * rise * 1.5;

  /* ── SKY, THROUGH FRESNEL ──────────────────────────────────────────────────────────
     Water reflects almost nothing looking straight down and almost everything at a glancing
     angle, which is why the sea is dark under your feet and silver at the horizon. */
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 zenith  = vec3(0.085, 0.170, 0.290);
  vec3 horizon = vec3(0.360, 0.470, 0.585);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(horizon, zenith, clamp(R.y, 0.0, 1.0));
  /* ⚠ 0.86 put bright sky into water you are looking straight down into, which is where
     the sea is nearly black. Schlick already falls off steeply; the extra factor was
     flattening the whole surface to one milky grey. */
  vec3 col = mix(body, sky, fres * 0.70);

  /* ── SUN GLITTER ───────────────────────────────────────────────────────────────────
     Not one highlight. A sun track is thousands of separate facets each catching the sun for
     an instant, and it spreads as the wind roughens the surface — narrow and mirror-like in a
     calm, a broad shivering road in a blow. */
  vec3 Hv = normalize(L + V);
  float rough = mix(430.0, 38.0, clamp(uWind / 16.0, 0.0, 1.0));
  float spec = pow(max(dot(N, Hv), 0.0), rough);
  float facet = 0.55 + 0.45 * fbm(vP.xz * 1.9 + vec2(drift * 2.2, 0.0));
  col += vec3(1.0, 0.955, 0.86) * spec * (1.6 * facet) * fres * 4.0;

  /* ── FOAM WHERE THE CREST OUTRUNS ITSELF ───────────────────────────────────────────
     A wave breaks when its crest moves faster than the wave does. Foam therefore belongs on
     the crests and in the streaks that trail off them, and only once there is wind enough. */
  float breakF = smoothstep(6.0, 14.0, uWind);
  float crestN = smoothstep(0.35, 0.95, vCrest / max(0.6, 0.9));
  float streak = fbm(vP.xz * 0.9 + vec2(drift * 1.2, 0.0));
  float foam = crestN * breakF * smoothstep(0.42, 0.78, streak);
  col = mix(col, vec3(0.86, 0.90, 0.92), clamp(foam, 0.0, 0.9));

  /* haze into the horizon so the plane reads as an ocean rather than a floor */
  float haze = smoothstep(uScale * 3.0, uScale * 14.0, dist);
  col = mix(col, vec3(0.10, 0.17, 0.24), haze);

  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.5), vec3(0.4545)), 1.0);
}
