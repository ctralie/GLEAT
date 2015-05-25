precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
varying float vID;

void main(void) {
	if (vID >= 0.0) {
		gl_FragColor = vec4(vID, 0.0, 0.0, 0.0);
	}
	else {
    	gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));
    }
}
