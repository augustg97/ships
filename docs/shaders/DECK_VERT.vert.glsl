varying vec3 vN; varying vec3 vP; varying vec3 vO;
/* vO is the HULL-space position: the covering is measured in the ship's own metres, so it
   must not ride the pose — a heeled or sea-borne ship keeps her planks where they were laid. */
void main(){ vN=normalize(normalMatrix*normal); vO=position;
  vec4 wp = modelMatrix*vec4(position,1.0); vP=wp.xyz;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
