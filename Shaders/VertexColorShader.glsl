attribute vec3 vPos;
attribute vec3 vNormal;
attribute vec3 vColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat3 uNMatrix;

uniform vec3 uAmbientColor;
uniform vec3 uLightingDirection;
uniform vec3 uDirectionalColor;

varying vec3 vLightCoeff;
varying vec3 vColorInterp;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
    
    vec3 transformedNormal = uNMatrix*vNormal;
    float dirLightWeight = max(dot(transformedNormal, uLightingDirection), 0.0);
    vLightCoeff = uAmbientColor + dirLightWeight*uDirectionalColor;
    vColorInterp = vColor;
}
