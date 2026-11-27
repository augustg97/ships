varying vec3 vN; varying vec3 vP; varying vec3 vO;
/* r352: the sun in HULL space, for a deck with another deck built over it. uSun is a view-space
   direction (it is lit against normalMatrix's normal), so the model-view rotation takes it back. */
uniform vec3 uSun; varying vec3 vLo;
/* vO is the HULL-space position: the covering is measured in the ship's own metres, so it
   must not ride the pose — a heeled or sea-borne ship keeps her planks where they were laid. */
void main(){ vN=normalize(normalMatrix*normal); vO=position;
  mat3 mv = mat3(modelViewMatrix);   // the transpose of a rotation is its inverse, by columns (GLSL ES 1.00 has no transpose)
  vLo = normalize(vec3(dot(mv[0], uSun), dot(mv[1], uSun), dot(mv[2], uSun)));
  vec4 wp = modelMatrix*vec4(position,1.0); vP=wp.xyz;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
