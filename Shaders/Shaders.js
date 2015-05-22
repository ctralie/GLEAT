///*****SHADER INITIALIZATION CODE*****///
//Type 0: Fragment shader, Type 1: Vertex Shader

function getShader(gl, filename, type) {
	var shadersrc = "";
	var shader;
	var request;
	if (type == "fragment") {
	    shader = gl.createShader(gl.FRAGMENT_SHADER);
	} 
	else if (type == "vertex") {
	    shader = gl.createShader(gl.VERTEX_SHADER);
	} 
	else {
	    return null;
	}

	//TODO: Get rid of synchronous mode
	$.ajax({
	    async: false,
	    url: filename,
	    success: function (data) {
	        shadersrc = data;
	    },
	    dataType: 'text'
	});
	
	gl.shaderSource(shader, shadersrc);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	    alert(gl.getShaderInfoLog(shader));
	    return null;
	}

	return shader;
}


function initShaders() {
	//Ordinary texture shader
	var fragmentShader = getShader(gl, "./FragmentShader.glsl", "fragment");
	var vertexShader = getShader(gl, "./VertexShader.glsl", "vertex");


	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	    alert("Could not initialise shaders");
	}

	//gl.useProgram(shaderProgram);

	shaderProgram.vPosAttrib = gl.getAttribLocation(shaderProgram, "vPos");
	gl.enableVertexAttribArray(shaderProgram.vPosAttrib);

	shaderProgram.texCoordAttrib = gl.getAttribLocation(shaderProgram, "texCoord");
	gl.enableVertexAttribArray(shaderProgram.texCoordAttrib);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.IDUniform = gl.getUniformLocation(shaderProgram, "ID");
}
