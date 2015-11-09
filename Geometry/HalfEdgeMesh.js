function MeshVertex(P, ID) {
    this.pos = vec3.clone(P); //Type vec3
    this.texCoords = [0.0, 0.0];
    this.halfEdge = null; // points to the "out-going" halfEdge
    this.ID = ID;
    this.color = null;
}

function MeshFace(ID) {
    this.ID = ID;
    this.halfEdge = null;
}

function MeshEdge(ID) {
    this.v1 = null;
    this.v2 = null;
    this.halfEdge = null; // if not boundary, point to arbitrary one of the two half edges associated with it
}

function MeshHalfEdge(vertex, face) {
    self.vertex = vertex; // points to the vertex at the "tail" of this halfEdge
    self.face = face;  // points to the face containing this halfEdge
    self.edge = null;
    self.prevHalfEdge = null; // points to the previous halfEdge associated with this edge
    self.nextHalfEdge = null; // points to the next halfEdge around the current face 
    self.flipHalfEdge = null; // points to the reverse halfEdge
    self.onBoundary = true; // true if this halfEdge is contained in a boundary loop; false otherwise
}

function MeshBuffer() {
    this.vPosition = [];
    this.vTexCoord = [];
    this.vColor = [];
    this.vNormal = [];
    this.fList = [];
    this.filename = "";

    this.readMesh = function(lines) {
        var fields = lines[0].match(/\S+/g);
	if (fields[0].toUpperCase() == "OFF" || fields[0].toUpperCase() == "COFF") {
            this.readOFFMesh(lines);
	}
	else {
	    console.log("Unsupported file type " + fields[0] + " for loading mesh");
	}
    }

    this.readOFFMesh = function(lines) {
        var nV = 0;
        var nE = 0;
        var nF = 0;
        var vRead = 0;
        var fRead = 0;
	var divideColor = false;

        for (var line = 0; line < lines.length; line++) {
            var fields = lines[line].match(/\S+/g);
            if (fields === null) { //Blank line
		continue;
	    }
	    if (fields[0].length == 0) {
		continue;
	    }
	    if (fields[0][0] == "#" || fields[0][0] == "\0" || fields[0][0] == " ") {
		continue;
	    }
            
            //Reading header
	    if (nV == 0) {
		if (fields[0] == "OFF" || fields[0] == "COFF") {
		    if (fields.length > 2) {
			nV = parseInt(fields[1]);
			nF = parseInt(fields[2]);
			nE = parseInt(fields[3]);
		    }
		    if (fields[0] == "COFF") {
			divideColor = true;	
		    }	
		}
		else {
		    if (fields.length >= 3) {
			nV = parseInt(fields[0]);
			nF = parseInt(fields[1]);
			nE = parseInt(fields[2]);					
		    }
		    else if (nVertices == 0) {
			console.log("Error parsing OFF file: Not enough fields for nVertices, nFaces, nEdges");
		    }
		}
	    }
            //Reading vertices
	    else if (vRead < nV) {
		if (fields.length < 3) {
		    console.log("Error parsing OFF File: Too few fields on a vertex line");
		    continue;
		}
		P = vec3.fromValues(parseFloat(fields[0]), parseFloat(fields[1]), parseFloat(fields[2]));
                this.vPosition.push(P);
                
		color = vec3.fromValues(0.8, 0.8, 0.8); // default color (0.8, 0.8, 0.8)
		if (fields.length >= 6) {
		    //There is color information
		    var color;
		    if (divideColor) {
			color = vec3.fromValues(parseFloat(fields[3])/255.0, parseFloat(fields[4])/255.0, parseFloat(fields[5])/255.0);
		    }
		    else {
			color = vec3.fromValues(parseFloat(fields[3]), parseFloat(fields[4]), parseFloat(fields[5]));
		    }
		}
                this.vColor.push(color);
                
		vRead++;
	    }
            //Reading faces
	    else if (fRead < nF) {
	        if (fields.length == 0) {
		    continue;
	        }
	        //Assume the vertices are specified in CCW order
	        var NVertices = parseInt(fields[0]);
	        if (fields.length < NVertices+1) {
		    console.log("Error parsing OFF File: Not enough vertex indices specified for a face of length " + NVertices);
	        }
	        var verts = Array(NVertices);
	        for (var i = 0; i < NVertices; i++) {
		    verts[i] = parseInt(fields[i+1]);
	        }
                this.fList.push(verts);
	        fRead++;
	    }
        }
    }
}

function HalfEdgeMesh() {
    this.vertices = [];
    this.edges = [];
    this.faces = [];
    this.components = [];
    this.needsDisplayUpdate = true;
    this.needsIndexDisplayUpdate = true;
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.indexBuffer = null;
    this.colorBuffer = null;
    
    /////////////////////////////////////////////////////////////
    ////                 GEOMETRY METHODS                   /////
    /////////////////////////////////////////////////////////////

    //Transformations are simple because geometry information is only
    //stored in the vertices
    this.Transform = function(matrix) {
	for (var i = 0; i < this.vertices.length; i++) {
	    vec3.transformMat4(this.vertices[i].pos, this.vertices[i].pos, matrix);
	}
	this.needsDisplayUpdate = true;
	this.needsIndexDisplayUpdate = true;
    }
    
    this.Translate = function(dV) {
	for (var i = 0; i < this.vertices.length; i++) {
	    vec3.add(this.vertices[i].pos, this.vertices[i].pos, dV);
	}
	this.needsDisplayUpdate = true;
	this.needsIndexDisplayUpdate = true;
    }
    
    this.Scale = function(dx, dy, dz) {
	for (var i = 0; i < this.vertices.length; i++) {
	    this.vertices[i].pos[0] *= dx;
	    this.vertices[i].pos[1] *= dy;
	    this.vertices[i].pos[2] *= dz;
	}
    }

    this.getCentroid = function() {
	center = vec3.fromValues();
	for (var i = 0; i < this.vertices.length; i++) {
	    vec3.add(center, center, vertices[i].pos);
	}
	vec3.scale(center, center, 1.0/this.vertices.length);
	return center;
    }
    
    this.getBBox = function() {
	if (this.vertices.length == 0) {
	    return AABox3D(0, 0, 0, 0, 0, 0);
	}
	var P0 = this.vertices[0].pos;
	var bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
	for (var i = 0; i < this.vertices.length; i++) {
	    bbox.addPoint(this.vertices[i].pos);
	}
	return bbox;
    }

    
    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////
    
    this.loadFile = function(filename) {
        var textdata = "";
	$.ajax({
	    async: false,
	    url: filename,
	    success: function (data) {
		textdata = data;
	    },
	    dataType: 'text'
	});
	this.loadFileFromLines(textdata.split("\n"));
    }

    this.loadFileFromLines = function(lines) {
	if (lines.length == 0) {
	    return;
	}
        meshBuffer = new MeshBuffer();
	meshBuffer.readMesh(lines);
        this.buildHalfEdgeMesh(meshBuffer);
	this.needsDisplayUpdate = true;
	this.needsIndexDisplayUpdate = true;
    }

    this.buildHalfEdgeMesh = function(meshBuffer) {
        // TODO: translate this function over
        console.log(meshBuffer.vPosition.length);
        console.log(meshBuffer.fList.length);
        console.log("building the half edge mesh from mesh buffer!");
    }
    
    /////////////////////////////////////////////////////////////
    ////                     RENDERING                      /////
    /////////////////////////////////////////////////////////////	
    
    //Copy over vertex and triangle information to the GPU
    this.updateBuffers = function(gl) {
	//Check to see if buffers need to be initialized
	if (this.vertexBuffer === null) {
	    this.vertexBuffer = gl.createBuffer();
	    //console.log("New vertex buffer: " + this.vertexBuffer);
	}
	if (this.normalBuffer === null) {
	    this.normalBuffer = gl.createBuffer();
	    //console.log("New normal buffer: " + this.normalBuffer);
	}
	if (this.indexBuffer === null) {
	    this.indexBuffer = gl.createBuffer();
	    //console.log("New index buffer: " + this.indexBuffer);
	}
	if (this.colorBuffer === null) {
	    this.colorBuffer = gl.createBuffer();
	    //console.log("New color buffer: " + this.colorBuffer);
	}
	//Vertex Buffer
	var V = new Float32Array(this.vertices.length*3);
	for (var i = 0; i < this.vertices.length; i++) {
	    V[i*3] = this.vertices[i].pos[0];
	    V[i*3+1] = this.vertices[i].pos[1];
	    V[i*3+2] = this.vertices[i].pos[2];
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
	this.vertexBuffer.itemSize = 3;
	this.vertexBuffer.numItems = this.vertices.length;
	
	//Normal buffer
	//TODO: NaNs in normals
	var N = new Float32Array(this.vertices.length*3);
	for (var i = 0; i < this.vertices.length; i++) {
	    var n = this.vertices[i].getNormal();
	    N[i*3] = n[0];
	    N[i*3+1] = n[1];
	    N[i*3+2] = n[2];
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, N, gl.STATIC_DRAW);
	this.normalBuffer.itemSize = 3;
	this.normalBuffer.numItems = this.vertices.length;
	
	//Color buffer
	var C = new Float32Array(this.vertices.length*3);
	for (var i = 0; i < this.vertices.length; i++) {
	    if (!(this.vertices[i].color === null)) {
		C[i*3] = this.vertices[i].color[0];
		C[i*3+1] = this.vertices[i].color[1];
		C[i*3+2] = this.vertices[i].color[2];
	    }
	    else {
		//Default color is greenish gray
		C[i*3] = 0.5;
		C[i*3+1] = 0.55;
		C[i*3+2] = 0.5;
	    }	
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, C, gl.STATIC_DRAW);
	this.colorBuffer.itemSize = 3;
	this.colorBuffer.numItems = this.vertices.length;
	
	//Index Buffer
	//First figure out how many triangles need to be used
	var NumTris = 0;
	for (var i = 0; i < this.faces.length; i++) {
	    NumTris += this.faces[i].edges.length - 2;
	}
	var I = new Uint16Array(NumTris*3);
	var i = 0;
	var faceIdx = 0;
	//Now copy over the triangle indices
	while (i < NumTris) {
	    var verts = this.faces[faceIdx].getVertices();
	    for (var t = 0; t < verts.length - 2; t++) {
		I[i*3] = verts[0].ID;
		I[i*3+1] = verts[t+1].ID;
		I[i*3+2] = verts[t+2].ID;
		i++;
	    }
	    faceIdx++;
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
	this.indexBuffer.itemSize = 1;
	this.indexBuffer.numItems = 3*NumTris;
    }
    
    //sProg: Shader program, pMatrix: Perspective projection matrix, mvMatrix: Modelview matrix
    //ambientColor, light1Pos, light2Pos, lightColor are all vec3s
    this.render = function(gl, sProg, pMatrix, mvMatrix, ambientColor, light1Pos, light2Pos, lightColor) {
	/*console.log("this.vertexBuffer = " + this.vertexBuffer);
	  console.log("this.normalBuffer = " + this.normalBuffer);
	  console.log("this.indexBuffer = " + this.indexBuffer);
	  console.log("this.colorBuffer = " + this.colorBuffer);*/
	
    	if (this.needsDisplayUpdate) {
    	    this.updateBuffers(gl);
    	    this.needsDisplayUpdate = false;
    	}
    	if (this.vertexBuffer === null) {
    	    console.log("Warning: Trying to render when buffers have not been initialized");
    	    return;
    	}
    	//Step 1: Bind all buffers
    	//Vertex position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(sProg.vPosAttrib, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        //Normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(sProg.normalAttrib, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        //Color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(sProg.colorAttrib, this.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        //Index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        //Step 2: Scale, translate, and rotate the mesh appropriately on top of whatever 
        //world transformation has already been passed along in mvMatrix, by sending over
        //the matrices to the GPU as uniforms.  Also send over lighting variables as uniforms
	gl.uniformMatrix4fv(sProg.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(sProg.mvMatrixUniform, false, mvMatrix);
	//Compute normal transformation matrix from world modelview matrix
	//(transpose of inverse of upper 3x3 part)
	nMatrix = mat3.create();
	mat3.normalFromMat4(nMatrix, mvMatrix);
	gl.uniformMatrix3fv(sProg.nMatrixUniform, false, nMatrix);
	
	gl.uniform3fv(sProg.ambientColorUniform, ambientColor);
	gl.uniform3fv(sProg.light1PosUniform, light1Pos);
	gl.uniform3fv(sProg.light2PosUniform, light2Pos);
	gl.uniform3fv(sProg.lightColorUniform, lightColor);
	
	//Step 3: Render the mesh
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0); 
    }
}
