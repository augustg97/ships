/* ── A DECK UNDER A DECK (round 352; a chunk since round 354). Each uCover is a deck built over the
   main deck with an end open on the waist: (x from, x to, the covering deck's height, which end is
   open: -1 at x from, +1 at x to), in hull metres. Under it the sun reaches a point only through the
   opening, when its ray climbs less than the deck's height over the run out to the open end, and the
   sky reaches it in the share h / (h + 2d) of a point d metres in from the opening under a deck h
   metres over it. uCoverN is 0 on every hull that has nothing built over its deck.
   DECK_FRAG includes this chunk, and hull.js slices the same text out of the bundled DECK_FRAG
   between the two markers below and injects it into every scene-lit part that stands under a cover
   (round 354), so the deck and the capstan on it cannot be lit by two different terms. */
#define COVER_TERM_BEGIN
uniform vec4 uCover[4];
uniform float uCoverN;
/* and the covering wall's half-breadth at eight stations evenly spaced in x over each cover's span
   (cover i at 8i..8i+7): a point outboard of the wall lies under the open sky */
uniform float uCoverHW[32];
/* one cover C's (sun, sky) visibility at hull-space point o under it, hw the half-breadth inside
   which the cover stands over o; (1, 1) where it does not */
vec2 coverOne(vec3 o, vec3 lo, vec4 C, float hw) {
  if (abs(o.z) > hw) return vec2(1.0);
  float h = C.z - o.y;
  float d = C.w < 0.0 ? o.x - C.x : C.y - o.x;      // metres in from the open end
  float toward = C.w < 0.0 ? -lo.x : lo.x;           // the sun's run out toward it
  float climb = toward > 1e-3 ? d * max(lo.y, 0.0) / toward : 1e6;
  return vec2(smoothstep(0.0, 0.08, h - climb), h / (h + 2.0 * d));
}
/* (sun visibility, sky visibility) at a point ON the covered deck, lo the sun in hull space */
vec2 coverVis(vec3 o, vec3 lo) {
  vec2 v = vec2(1.0);
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uCoverN) break;
    vec4 C = uCover[i];
    if (o.x < C.x || o.x > C.y || o.y > C.z - 0.05) continue;
    float t = clamp((o.x - C.x) / max(C.y - C.x, 1e-3), 0.0, 1.0) * 7.0, hw = 0.0;
    for (int k = 0; k < 7; k++) {
      if (t >= float(k) && t <= float(k + 1)) hw = mix(uCoverHW[i * 8 + k], uCoverHW[i * 8 + k + 1], t - float(k));
    }
    v = min(v, coverOne(o, lo, C, hw));
  }
  return v;
}
#ifdef COVER_PARTS
/* A PART standing on the covered deck (round 354) is anywhere between the deck and the cover, so
   the half-breadth is the shell's AT ITS HEIGHT: per station (the shell's half-breadth at the
   deck, at the cover's underside, the deck's height), mixed by height. A point below the deck
   (the keel, the rudder, an anchor hanging at the bow) is outside the space the cover roofs. */
uniform vec3 uCoverSt[32];
/* and how far short of the closed end (the end away from the opening) a part's span stops: the hull's own end is a
   wall as the side is, so a sternpost or a rudder head proud of the stern stands in the open (COVER_SIDE_M, 0 where
   the far end is the midpoint of an island open at both ends) */
uniform float uCoverEnd[4];
vec2 coverVisPart(vec3 o, vec3 lo) {
  vec2 v = vec2(1.0);
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uCoverN) break;
    vec4 C = uCover[i];
    if (o.x < C.x || o.x > C.y || o.y > C.z - 0.05) continue;
    if (C.w < 0.0 ? o.x > C.y - uCoverEnd[i] : o.x < C.x + uCoverEnd[i]) continue;
    float t = clamp((o.x - C.x) / max(C.y - C.x, 1e-3), 0.0, 1.0) * 7.0;
    vec3 st = vec3(0.0);
    for (int k = 0; k < 7; k++) {
      if (t >= float(k) && t <= float(k + 1)) st = mix(uCoverSt[i * 8 + k], uCoverSt[i * 8 + k + 1], t - float(k));
    }
    if (o.y < st.z - 0.05) continue;
    float hw = mix(st.x, st.y, clamp((o.y - st.z) / max(C.z - st.z, 0.1), 0.0, 1.0));
    v = min(v, coverOne(o, lo, C, hw));
  }
  return v;
}
#endif
#define COVER_TERM_END
