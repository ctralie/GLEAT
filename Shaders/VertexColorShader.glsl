attribute vec3 vPos;
attribute vec3 vNormal;
attribute vec3 vColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
}
