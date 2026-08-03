precision highp float;
varying vec3 vDir;
uniform vec3 uSun;
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.11; a*=0.5;} return v; }

/* ── A SKY, BECAUSE THE BACKGROUND WAS NOTHING AT ALL ──────────────────────────────────
   The Shipwright had no background: the black was empty space. A ship photographed against
   black is a museum object on a plinth; a ship against sky is a ship.

   The gradient is not a designer's choice. A clear sky is blue overhead and pale at the
   horizon because RAYLEIGH SCATTERING goes as 1/λ⁴ — short wavelengths scatter hardest — and
   because a horizon sightline passes through far more atmosphere than a vertical one, so it
   accumulates enough multiple scattering to wash back toward white. That single fact gives
   the whole vertical ramp, and getting it backwards is the commonest way a fake sky reads
   fake.

   Round the sun there is a bright forward-scattering aureole, which is Mie scattering off
   aerosol and is much broader and whiter than the sun's own disc. */
void main() {
  vec3 D = normalize(vDir);
  float h = clamp(D.y, -0.10, 1.0);

  vec3 zenith  = vec3(0.185, 0.395, 0.740);
  vec3 horizon = vec3(0.760, 0.845, 0.930);
  /* pow shapes how fast the wash-out falls off with altitude; 0.42 is a clear, dry day */
  vec3 col = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.42));

  vec3 L = normalize(uSun);
  float cosA = dot(D, L);
  /* the aureole: broad, white, and centred on the sun */
  col += vec3(1.0, 0.94, 0.82) * pow(max(cosA, 0.0), 7.0) * 0.34;
  col += vec3(1.0, 0.97, 0.90) * pow(max(cosA, 0.0), 220.0) * 1.1;

  /* ── FAIR-WEATHER CUMULUS ───────────────────────────────────────────────────────────
     Flat-bottomed, because they form at the lifting condensation level and that altitude is
     the same for all of them on a given day — which is why a fair-weather sky looks like
     cloud sitting on an invisible shelf. Domed on top, where the thermal is still rising. */
  float cloudBand = smoothstep(0.02, 0.30, D.y) * (1.0 - smoothstep(0.42, 0.95, D.y));
  vec2 cp = D.xz / max(D.y + 0.14, 0.06) * 0.75 + vec2(uTime * 0.0045, 0.0);
  float c = fbm(cp * 1.35);
  float cover = smoothstep(0.52, 0.78, c) * cloudBand;
  /* lit on the sun side, grey and flat underneath */
  float lit = 0.5 + 0.5 * cosA;
  vec3 cloud = mix(vec3(0.62, 0.66, 0.72), vec3(1.0, 0.99, 0.96), lit);
  col = mix(col, cloud, cover * 0.92);

  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.6), vec3(0.4545)), 1.0);
}
