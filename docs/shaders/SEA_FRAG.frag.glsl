precision highp float;
varying vec3 vP; varying vec2 vUv;
uniform vec3 uSun, uCam; uniform float uTime, uWind, uScale;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.07; a*=0.5;} return v; }

void main(){
  vec2 p = vP.xz / uScale;
  float drift = uTime * 0.16 * (0.5 + uWind * 0.06);
  /* swell runs in one direction and the wind chop across it, which is what real water does */
  float swell = fbm(p * vec2(0.30, 1.5) + vec2(drift, 0.0));
  float chop  = fbm(p * vec2(3.2, 6.0) - vec2(drift * 2.1, 0.0));
  float h = swell * 0.65 + chop * 0.35;

  vec3 N = normalize(vec3((swell - 0.5) * 0.55 + (chop - 0.5) * 0.30,
                          1.0,
                          (chop - 0.5) * 0.42));
  vec3 V = normalize(uCam - vP);
  vec3 L = normalize(uSun);

  float dist = length(vP.xz);
  vec3 deep = vec3(0.020, 0.070, 0.115);
  vec3 shal = vec3(0.045, 0.135, 0.160);
  vec3 col = mix(shal, deep, clamp(dist / (uScale * 8.0), 0.0, 1.0));

  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  col = mix(col, vec3(0.30, 0.44, 0.56), fres * 0.62);

  vec3 Hv = normalize(L + V);
  float shin = mix(340.0, 46.0, clamp(uWind / 16.0, 0.0, 1.0));
  col += vec3(1.0, 0.96, 0.88) * pow(max(dot(N, Hv), 0.0), shin) * 0.9;

  float breakF = smoothstep(6.0, 13.0, uWind);
  float foam = smoothstep(0.60 - breakF * 0.22, 0.82, h);
  col = mix(col, vec3(0.88, 0.92, 0.94), foam * breakF * 0.75);

  /* haze into the horizon so the plane reads as an ocean rather than a floor */
  float haze = smoothstep(uScale * 3.0, uScale * 14.0, dist);
  col = mix(col, vec3(0.10, 0.17, 0.24), haze);

  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.5), vec3(0.4545)), 1.0);
}
