precision highp float;
varying vec3 vDir;
/* The dome is drawn as a big inverted sphere parented to nothing, so the direction from the
   centre to the vertex IS the view direction for that fragment. */
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
