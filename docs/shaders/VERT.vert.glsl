varying vec3 vPos;
varying vec3 vNormalW;
void main(){
  vPos = position;
  vNormalW = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
