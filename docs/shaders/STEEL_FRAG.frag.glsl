precision highp float;
/* ── PAINTED STEEL THAT STANDS ON THE SHELL ──────────────────────────────────────────────
   A bulwark or riser rising flush from the hull is the shell's own surface continued, and it
   must take the light the shell takes. MeshStandardMaterial cannot do that: it is lit by the
   scene's lights through ACES and the sRGB transfer, while the shell is lit by HULL_FRAG's
   own one-sun recipe — measured round 102 at 216 vs 89 sRGB for the SAME white paint on the
   SAME orientation, a hard tone seam along Azzam's whole terrace run. So this is HULL_FRAG's
   closing light recipe (sun, sky, water bounce, paint spec, the same gamma), on a plain
   colour, sharing the hull material's own uSun/uCam uniform objects so it cannot drift.
   Deliberately kept normal-convention-identical to HULL_VERT — quirks included — because
   matching the shell exactly is the whole point. */
varying vec3 vN; varying vec3 vP;
uniform vec3 uSun, uCam, uCol;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vP);
  vec3 L = normalize(uSun);
  float lam = max(dot(N, L), 0.0);
  float sky = 0.5 + 0.5 * N.y;
  float bounce = max(0.0, -N.y) * 0.30;
  vec3 lit = uCol * (0.24 * sky + 0.95 * lam) + uCol * bounce * vec3(0.34, 0.52, 0.62);
  vec3 Hv = normalize(L + V);
  float spec = pow(max(dot(N, Hv), 0.0), 22.0) * 0.16;
  lit += vec3(1.0, 0.97, 0.90) * spec * lam;
  gl_FragColor = vec4(pow(clamp(lit, 0.0, 1.6), vec3(0.4545)), 1.0);
}
