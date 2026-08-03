precision highp float;
varying vec3 vP; varying vec2 vUv; varying vec3 vN; varying float vCrest;
uniform float uTime, uWind;
/* xy = travel direction, z = wavelength in metres, w = amplitude in metres */
uniform vec4 uWave[4];

/* ── GERSTNER WAVES, NOT SINES ────────────────────────────────────────────────────────
   The sea was a FLAT PLANE with a normal map painted on it — PlaneGeometry(1,1,1,1), two
   triangles, no geometry to make a wave out of at all. Every ripple was a lie told by the
   shading, which is why nothing floated and nothing occluded anything.

   A sine wave is symmetric: round crests, round troughs. Real water is not. Water particles
   move in CIRCLES, not up and down, so the surface bunches at the crest and stretches in the
   trough — sharp peaks, broad flat valleys. Gerstner (1802) is exactly that motion: displace
   horizontally by cos as well as vertically by sin, and the crest sharpens for free.

   And the speed is NOT a free parameter. A deep-water gravity wave travels at c = sqrt(g/k),
   so long swell outruns short chop — which is why swell reaches a coast days before the storm
   that raised it, sorted by wavelength. Giving each component its own physical speed is what
   stops a sea looking like a scrolling texture. */
void main() {
  vUv = uv;
  vec3 P = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 acc = vec3(0.0);
  vec3 nrm = vec3(0.0, 1.0, 0.0);
  float crest = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2  d = normalize(uWave[i].xy);
    float L = uWave[i].z;
    /* amplitude grows with wind; a flat calm still has an old swell running under it */
    float A = uWave[i].w * (0.30 + 0.070 * uWind);
    float k = 6.2831853 / L;
    float c = sqrt(9.81 / k);                       // deep-water phase speed
    float ph = k * dot(d, P.xz) - c * k * uTime;
    float s = sin(ph), co = cos(ph);
    /* steepness, held below the value at which a Gerstner wave folds through itself */
    float Q = min(0.72 / max(k * A * 4.0, 1e-4), 1.0);
    acc.x += Q * A * d.x * co;
    acc.z += Q * A * d.y * co;
    acc.y += A * s;
    nrm.x -= d.x * k * A * co;
    nrm.z -= d.y * k * A * co;
    nrm.y -= Q * k * A * s;
    crest += s * uWave[i].w;
  }
  P += acc;
  vP = P;
  vN = normalize(nrm);
  vCrest = crest;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}
