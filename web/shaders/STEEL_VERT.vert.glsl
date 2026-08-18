varying vec3 vN; varying vec3 vP;
void main(){ vN=normalize(normalMatrix*normal);
  vec4 wp = modelMatrix*vec4(position,1.0); vP=wp.xyz;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
