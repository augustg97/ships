precision highp float;
varying vec3 vP; varying vec2 vUv; varying vec3 vN; varying float vCrest;
varying vec2 vRest;          /* pre-Gerstner ground position — see SEA_VERT */
uniform vec3 uSun, uCam; uniform float uTime, uWind, uScale;
/* ── ⚠ HOW FAR THE FINE RIPPLE IS STILL WORTH DRAWING ─────────────────────────────────────
   This used to be uScale, which is the EYE HEIGHT — so from a deck the close-up's ripple
   vanished two hundred metres from the hull while the Shipwright, which hard-codes uScale at
   150, kept it to seven hundred and fifty. Same shader, same wave table, two different oceans,
   and the Sea's was the worse one.
   Whether a ripple is worth drawing is a question about PIXELS, not about altitude: it stops
   being visible where its wavelength falls below one pixel, which is lambda x screenHeight /
   (2 tan(fov/2)) away. Computed in JS and handed in, so every view that draws water gets the
   same law and they cannot diverge again. */
uniform float uRip;

#include "ATMO.chunk.glsl"

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
/* ── THE SHIP'S OWN WATER ────────────────────────────────────────────────────────────────
   A hull moving through water leaves three things, and they are three different phenomena:
     * the BOW WAVE, thrown up and outward where the stem parts the water;
     * the KELVIN ARMS, a pair of crests at 19.47 degrees either side of the track — an angle
       that is the same for every displacement hull at every speed, because it falls out of
       the dispersion of deep-water waves and not out of the ship;
     * the TURBULENT WAKE, a band of aerated water astern, widening and dying over some ten
       ship-lengths, which is the one you can see from a long way off.
   uWakeP is her position on this patch in metres, uWakeDir her heading, uWakeKn her speed.
   With no way on, there is no wake — the terms all scale off speed, so a ship stopped makes
   none of them. */
const vec3 HORIZON_C = vec3(0.360, 0.470, 0.585);
uniform vec2  uWakeP;
uniform vec2  uWakeDir;
uniform float uWakeLen;
uniform float uWakeBeam;
uniform float uWakeKn;

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
    /* at the REST position: the wave must not carry the coastline with it */
    float e = seaElevAt(vec3(vRest.x, 0.0, vRest.y));
    if (e > 0.0) discard;                      // this is land: let the ground own the pixel
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
  float rippleFade = 1.0 - smoothstep(uRip * 0.22, uRip, dist);
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

  /* ── HER WAKE ──────────────────────────────────────────────────────────────────────── */
  if (uWakeKn > 0.15 && uWakeLen > 0.5) {
    vec2  rel    = vP.xz - uWakeP;
    float along  = dot(rel, -uWakeDir);                   // positive ASTERN of her
    float across = abs(dot(rel, vec2(-uWakeDir.y, uWakeDir.x)));
    float spd    = clamp(uWakeKn / 16.0, 0.25, 1.5);
    /* ⚠ TWO DIFFERENT PHYSICS, AND THEY DO NOT SCALE THE SAME WAY WITH SPEED. Wave-making —
       the Kelvin arms and the transverse crests — is governed by Froude number and really is
       almost nothing at low speed: the treasure ship at 4.3 kn over 70 m sits at Fr = 0.08 and
       makes hardly any wave at all, which is correct and should stay correct. But the WHITE
       WATER is not wave-making. It is the boundary layer stripping off the hull and crests
       breaking against a moving obstacle, and a hull under way makes that at any speed she is
       actually moving. Scaling both by the same factor left a 70 m ship crossing an ocean with
       no visible disturbance at all — physically defensible for the waves, wrong for the foam,
       and illegible either way, which rule 0 does not allow. */
    float churnSpd = clamp(uWakeKn / 16.0, 0.55, 1.3);
    /* ⚠ TEN SHIP-LENGTHS OF FULL-STRENGTH ARM READS AS SEARCHLIGHTS, NOT AS WATER. The first
       version ran the Kelvin arms at 0.62 over 980 m at a constant width, which on screen is a
       pair of long straight bright lines converging on the hull — the eye calls that light, not
       wake. A real wake is broadest and brightest in the first two lengths and is essentially
       texture by ten. Shorter, wider with distance, and much weaker in the arms than in the
       turbulent band, which is the part you actually see from a ship. */
    float len    = uWakeLen * 6.0 * spd;
    float fade   = clamp(1.0 - along / len, 0.0, 1.0);
    float w = 0.0;

    /* ⚠ THE STRAIGHT LINES WERE step(), AND THEN THEY WERE THE PATTERN ITSELF. The r44
       rewrite replaced every step() with a smoothstep and the razor EDGES went; r111 looked
       at the result from above (wake_capture.py, a bearing the URL cannot address) and found
       the next class down: the transverse crests were drawn as cos(2*pi*along/lambda) — a
       ladder of perfectly straight rungs — and the arms as two solid ropes, constant along
       three kilometres. Nothing in a real wake is straight-and-solid: the crests CURVE,
       because the phase of a Kelvin wake is not linear in along, and the arms are FEATHERS —
       short oblique divergent-wave crests strung along the cusp line — not lines.

       Both come out of one piece of physics, so both are drawn from it. At a point m =
       across/aStem inside the wedge, stationary phase picks the wave direction theta that
       contributes: tan(theta) = (1 -/+ sqrt(1 - 8 m^2)) / (4 m) — the '-' root is the
       transverse family, the '+' root the divergent — and the phase there is
       k0 * aStem * (cos t + m sin t) / cos^2 t, k0 = g/V^2. The factor runs from 1.00 on
       the track to 1.53 at the cusp, which is exactly the backward curl every aerial
       photograph shows, and the discriminant hitting zero at m = 1/(2*sqrt(2)) IS the
       19.47-degree wedge — the same number, from the same dispersion, not a second model.

       AND THE WEDGE SPRINGS FROM THE STEM. The arms used to start a quarter-length abaft
       amidships; the wave pattern of a moving hull starts where the hull starts. aStem is
       distance abaft the STEM; the turbulent band alone keeps the stern for its origin.

       AND THE BOW WAVE WAS A DISC. smoothstep(len*0.55, 0, dStem) is a radial glow half a
       ship-length in radius centred on the stem — on the container ship a 220 m white blob
       ahead of her, read from any height as a searchlight pointed at the water. A bow wave
       is a CREST: it hugs the stem at about half a beam and is gone within one. Drawn now
       as an annulus at that radius, gated so it cannot spill more than a fraction of a
       beam ahead of the hull. */
    float halfL  = uWakeLen * 0.5;
    float soft   = uWakeBeam * 0.45;                  /* the softening width, her own beam */

    /* ── HOW FAR EACH FEATURE IS STILL WORTH DRAWING ──────────────────────────────────
       The old fade was 1 - smoothstep(uScale*2, uScale*9, dist), and uScale is the EYE
       HEIGHT: from a deck the whole wake of a 400 m ship vanished nine hundred metres out
       while the ship herself stayed crisp at fourteen hundred — the same eye-height fallacy
       the ripple paid for at the top of this file, in the same shader. Visibility is a
       question about PIXELS: a feature s metres across holds until its size falls under a
       pixel, and uRip already encodes that law for a 2 m wavelength, so the reach of s is
       uRip * s / 2. Each feature fades by its own size; the broad band needs no fade at
       all, because a sixty-metre white road really is visible for tens of kilometres and
       the shared haze at the bottom of main() already owns the far field. */

    /* ── 1. THE TURBULENT BAND, from the stern aft ────────────────────────────────────
       White water that the hull has actually broken: aerated, chaotic, and the brightest
       thing in a wake close to. It begins at the stern, widens astern, and decays. Its
       churn texture is ~16 m grain, so beyond that grain's pixel reach the band keeps its
       MEAN rather than sparkling sub-pixel noise. */
    float aft    = along - halfL;                     /* positive ABAFT the stern */
    float halfW  = uWakeBeam * (0.5 + 1.1 * clamp(aft / len, 0.0, 1.0));
    float churn  = fbm(vec2(aft * 0.06 - drift * 1.7, across * 0.10));
    float churnReach = uRip * 8.0;
    float churnTex = mix(0.775, 0.55 + 0.45 * churn,
                         1.0 - smoothstep(churnReach * 0.5, churnReach, dist));
    w += smoothstep(-soft, soft, aft) * fade * fade * churnSpd *
         smoothstep(halfW, halfW * 0.30, across) * churnTex;

    /* ── 2-3. THE KELVIN PATTERN, from its own dispersion ─────────────────────────────
       lambda = 2*pi*V^2/g — a slow boat leaves close-set ripples, a fast ship long swells,
       and it is not a free parameter. Both wave families below share it through k0. */
    float V      = uWakeKn * 0.5144;                  /* knots to metres per second */
    float lambda = max(2.0, 6.2831853 * V * V / 9.81);
    float k0     = 6.2831853 / lambda;
    float aStem  = along + halfL;                     /* positive abaft the STEM */
    float m      = across / max(aStem, 1.0);
    float mc     = min(m, 0.3530);                    /* just inside the cusp, disc >= 0 */
    float disc   = sqrt(max(0.0, 1.0 - 8.0 * mc * mc));
    /* the transverse root: theta -> 0 on the track, 35.26 deg at the cusp */
    float tT = (mc > 1e-3) ? (1.0 - disc) / (4.0 * mc) : mc;
    float cT = inversesqrt(1.0 + tT * tT);
    float phT = k0 * aStem * (cT + mc * tT * cT) / (cT * cT);
    /* the divergent root: steep short waves near the track, meeting the transverse family
       at the cusp. Only evaluated where the arm envelope is non-zero, so the floor on mc
       never shows. */
    float tD = (1.0 + disc) / (4.0 * max(mc, 0.02));
    float cD = inversesqrt(1.0 + tD * tD);
    float phD = k0 * aStem * (cD + mc * tD * cD) / (cD * cD);

    /* ── 2. THE ARMS: divergent-wave feathers along the cusp line ─────────────────────
       The envelope holds the 19.47-degree line; the feathers are the divergent crests
       themselves, cos(phD), each a short oblique wavelet — which is why a real arm
       sparkles instead of reading as a rope. Feather grain is about half a lambda, and
       fades by the pixel law like everything else. */
    float arm    = abs(across - aStem * 0.3536);
    float armW   = uWakeBeam * (0.35 + 0.9 * clamp(aStem / len, 0.0, 1.0));
    float feaReach = uRip * lambda * 0.25;
    float feather = mix(0.5, 0.5 + 0.5 * cos(phD),
                        1.0 - smoothstep(feaReach * 0.5, feaReach, dist));
    w += smoothstep(-soft * 0.5, soft * 1.5, aStem - uWakeBeam * 0.5) * fade * fade * 0.42 *
         smoothstep(armW, armW * 0.10, arm) * feather;

    /* ── 3. THE TRANSVERSE WAVES, curved by the same phase ────────────────────────────
       cos(phT) instead of cos(k0*along): the crests now curl backward toward the cusps,
       where they merge with the divergent family, because the phase factor grows from 1.0
       to 1.53 across the wedge. The gate dies AT the wedge edge in m, the wedge's own
       coordinate. */
    float inArm  = smoothstep(0.354, 0.30, m);
    float barReach = uRip * lambda * 0.5;
    w += smoothstep(-soft, soft, aft) * fade * fade * inArm * 0.22 *
         (0.5 + 0.5 * cos(phT)) *
         (1.0 - smoothstep(barReach * 0.5, barReach, dist));

    /* ── 4. THE BOW WAVE, a crest hugging the stem ────────────────────────────────────
       An annulus at about half a beam off the stem, softened over its own width, and
       gated so it cannot reach more than a fraction of a beam ahead of her: the water
       ahead of a ship is undisturbed, which is most of what makes a bow wave read as a
       bow wave. */
    vec2  stem   = uWakeDir * halfL;                  /* her stem, in patch metres */
    float dStem  = length(rel - stem);
    float bowR   = uWakeBeam * 0.55;
    float ring   = smoothstep(bowR * 1.9, bowR * 0.9, dStem) *
                   smoothstep(bowR * 0.15, bowR * 0.7, dStem);
    /* ⚠ the first gate left 40% of the annulus's dead-ahead arc alive, and from above the
       bow wore a complete RING — a coin under her stem. The window now closes just ahead
       of the stem, so what survives is a horseshoe opening astern: two shoulder crests
       and nothing in the water she has not yet reached. */
    w += ring * smoothstep(-halfL - uWakeBeam * 0.35, -halfL + uWakeBeam * 0.45, along) *
         0.60 * churnSpd;

    /* ⚠ and NOT another * spd here — that was applying the speed twice to terms that had
       already taken it, which is how a slow ship ended up with 7% of a wake. */
    w = clamp(w, 0.0, 0.85);
    /* aerated water is brighter, and it scatters instead of reflecting */
    col = mix(col, vec3(0.88, 0.92, 0.94), w);
  }

  /* ── ONE ATMOSPHERE — the same law and the same colour the near ground uses ─────────
     uScale is the eye height, so this used to extinguish over a few hundred metres from a
     deck: the ocean became a featureless dark plate a kilometre from the ship while the coast
     behind it stayed bright. Distance haze is a property of the AIR, not of how high you are
     standing, and 38 km is clear-air visibility over water. */
  col = mix(col, HORIZON_C, 1.0 - exp(-dist / 38000.0));
  /* night — one factor on the finished water, the same the sky and the ground hold, so a
     moonlit sea sits under a moonlit sky instead of keeping its noon body. The old form
     dimmed only the haze TARGET, and to 0.10 — darker than anything else in the frame kept
     itself, and applied to nothing nearer than the haze. See ATMO.chunk.glsl. */
  col *= atmoBright(L);

  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.5), vec3(0.4545)), 1.0);
}
