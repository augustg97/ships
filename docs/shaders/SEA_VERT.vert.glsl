varying vec3 vP; varying vec2 vUv;
void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vP=wp.xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
