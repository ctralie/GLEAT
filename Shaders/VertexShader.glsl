attribute vec3 vPos;
attribute vec3 vNormal;

attribute vec2 texCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform float ID;


varying vec2 vTextureCoord;


varying float vID;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
    vTextureCoord = texCoord;
	vID = ID;
}
