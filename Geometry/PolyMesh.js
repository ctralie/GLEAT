//TODO: Figure out how to jointly require gl-matrix-min.js

function MeshVertex(P, ID) {
	this.pos = vec3.clone(P); //Type vec3
	this.texCoords = [0.0, 0.0];
	this.ID = ID;
	this.edges = [];
	this.component = -1;//Which connected component it's in
	this.color = null;
	
	this.getVertexNeighbors = function() {
		var ret = Array(this.edges.length);
		for (var i = 0; i < this.edges.length; i++) {
			ret[i] = this.edges[i].vertexAcross(this);
		}
		return ret;
	}
	
	//Return a set of all faces attached to this vertex
	this.getAttachedFaces = function() {
		var ret = [];
		for (var i = 0; i < this.edges.length; i++) {
			//TODO: Takes O(n^2) time right now.  Should use hash or tree-based
			//set instead of Javascript array
			if (!(edges[i].f1 === null)) {
				if (ret.indexOf(edges[i].f1) == -1) {
					ret.push(edges[i].f1);
				}
			}
			if (!(edges[i].f2 === null)) {
				if (ret.indexOf(edges[i].f2) == -1) {
					ret.push(edges[i].f2);
				}
			}
		}
		return ret;
	}
	
	//Return the area of the one-ring faces attached to this vertex
	this.getOneRingArea = function() {
		var faces = this.getAttachedFaces();
		var ret = 0.0;
		for (var i = 0; i < faces.length; i++) {
			ret += faces[i].getArea();
		}
		return ret;
	}
	
	//Get an estimate of the vertex normal by taking a weighted
	//average of normals of attached faces	
	this.getNormal = function() {
		faces = self.getAttachedFaces();
		totalArea = 0.0;
		var normal = vec3.fromValues(0, 0, 0);
		var w;
		var N;
		for (var i = 0; i < faces.length; i++) {
			w = faces[i].getArea();
			totalArea += w;
			N = f.getNormal();
			vec3.scale(N, N, w);
			vec3.add(normal, normal, N);
		}
		vec3.scale(normal, normal, 1.0/totalArea);
		return vec3;
	}
}

function MeshFace(ID) {
	this.ID = ID;
	this.edges = []; //Store edges in CCW order
	this.startV = 0; //Vertex object that starts it off
	//Cache area, normal, and centroid
	this.area = null;
	this.normal = null;
	this.centroid = null;
	
	this.flipNormal = function() {
		//Reverse the specification of the edges to make the normal
		//point in the opposite direction
		this.edges.reverse();
		this.normal = null;
	}
	
	this.getVertices = function() {
		var ret = Array(this.edges.length);
		var v = this.startV;
		for (var i = 0; i < this.edges.length; i++) {
			ret[i] = v;
			v = this.edges[i].vertexAcross(v);
		}
		return ret;
	}
	
	this.getNormal = function() {
		if (this.normal === null) {
			var verts = this.getVertices();
			for (var i = 0; i < verts.length; i++) {
				verts[i] = verts[i].pos;
			}
			this.normal = getFaceNormal(verts);
		}
		return this.normal;
	}
	
	this.getArea = function() {
		if (this.area === null) {
			var verts = this.getVertices();
			for (var i = 0; i < verts.length; i++) {
				verts[i] = verts[i].pos;
			}
			this.area = getPolygonArea(verts);
		}
		return this.area;
	}
	
	this.getCentroid = function() {
		if (this.centroid === null) {
			var ret = vec3.fromValues(0, 0, 0);
			var verts = this.getVertices();
			if (verts.length == 0) {
				return ret;
			}
			for (var i = 0; i < verts.length; i++) {
				vec3.add(ret, ret, verts[i].pos);
			}
			vec3.scale(ret, ret, 1.0/verts.length);
			this.centroid = ret;
		}
		return this.centroid;
	}
	
	this.getPlane = function() {
		return new Plane3D(this.startV.pos, this.getNormal());
	}
}

function MeshEdge(v1, v2, ID) {
	this.ID = ID;
	this.v1 = v1;
	this.v2 = v2;
	this.f1 = null;
	this.f2 = null;
	
	this.vertexAcross = function(startV) {
		if (startV === this.v1) {
			return this.v2;
		}
		if (startV === this.v2) {
			return this.v1;
		}
		console.log("Warning (vertexAcross): Vertex not member of edge\n");
		return null;
	}
	
	this.addFace = function(face, v1) {
		if (this.f1 === null) {
			this.f1 = face;
		}
		else if (this.f2 === null) {
			this.f2 = face;
		}
		else {
			console.log("Error (addFace): Cannot add face to edge; already 2 there\n");
		}
	}
	
	//Remove pointer to face
	this.removeFace = function(face) {
		if (this.f1 === face) {
			self.f1 = null;
		}
		else if(self.f2 === face) {
			self.f2 = null;
		}
		else {
			console.log("Error (removeFace); Cannot remove edge pointer to face that was never part of edge\n");
		}
	}
	
	this.faceAcross = function(startF) {
		if (startF === this.f1) {
			return this.f2;
		}
		if (startF === this.f2) {
			return this.f1;
		}
		console.log("Warning (faceAcross): Face not member of edge\n");
		return null;
	}
	
	this.getCenter = function() {
		var ret = vec3.create();
		vec3.lerp(ret, this.v1.pos, this.v2.pos, 0.5);
		return ret;
	}
	
	this.numAttachedFaces = function() {
		var ret = 0;
		if (!(this.f1 === null)) {
			ret++;
		}
		if (!(this.f2 === null)) {
			ret++;
		}
		return ret;
	}
}

function getFaceInCommon(e1, e2) {
	var e2faces = [];
	if (!(e2.f1 === null)) {
		e2faces.push(e2.f1);
	}
	if (!(e2.f2 === null)) {
		e2faces.push(e2.f2);
	}
	if (e2faces.indexOf(e1.f1)) {
		return e1.f1;
	}
	if (e2faces.indexOf(e1.f2)) {
		return e1.f2;
	}
	return null;
}

function getEdgeInCommon(v1, v2) {
	for (var i = 0; i < v1.edges.length; i++) {
		if (v1.edges[i].vertexAcross(v1) === v2) {
			return v1.edges[i];
		}
	}
	return null;
}

function getVertexInCommon(e1, e2) {
	var v = [e1.v1, e1.v2, e2.v1, e2.v2];
	for (var i = 0; i < 4; i++) {
		for(var j = i + 1; j < 4; j++) {
			if (v[i] === v[j]) {
				return v[i];
			}
		}
	}
	return null;
}

//Main Polygon Mesh Class
function PolyMesh() {
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
	////                ADD/REMOVE METHODS                  /////
	/////////////////////////////////////////////////////////////	
	
	this.addVertex = function(P, color) {
		vertex = new MeshVertex(P, this.vertices.length);
		vertex.color = (typeof color !== 'undefined' ? color : null);
		this.vertices.push(vertex);
		return vertex;
	}
	
	//Create an edge between v1 and v2 and return it
	//This function assumes v1 and v2 are valid vertices in the mesh
	this.addEdge = function(v1, v2) {
		edge = new MeshEdge(v1, v2, this.edges.length);
		this.edges.push(edge);
		v1.edges.push(edge);
		v2.edges.push(edge);
		return edge;
	}
	
	//Given a list of pointers to mesh vertices in CCW order
	//create a face object from them
	this.addFace = function(meshVerts) {
		var vertsPos = Array(meshVerts.length);
		for (var i = 0; i < vertsPos.length; i++) {
			vertsPos[i] = meshVerts[i].pos;
		}
		if (!arePlanar(vertsPos)) {
			console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not planar\n")
			for (var i = 0; i < vertsPos.length; i++) {
				console.log(vecStr(vertsPos[i]) + ", ");
			}
			return null;
		}
		if (!are2DConvex(vertsPos)) {
			console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not convex\n");
			for (var i = 0; i < vertsPos.length; i++) {
				console.log(vecStr(vertsPos[i]) + ", ");
			}
			return null;
		}
		var face = new MeshFace(this.faces.length);
		face.startV = meshVerts[0];
		for (var i = 0; i < meshVerts.length; i++) {
			var v1 = meshVerts[i];
			var v2 = meshVerts[(i+1)%meshVerts.length];
			var edge = getEdgeInCommon(v1, v2);
			if (edge === null) {
				edge = this.addEdge(v1, v2);
			}
			face.edges.push(edge);
			edge.addFace(face, v1); //Add pointer to face from edge
		}
		this.faces.push(face);
		return face;
	}
	
	//Remove the face from the list of faces and remove the pointers
	//from all edges to this face
	this.removeFace = function(face) {
		//Swap the face to remove with the last face (O(1) removal)
		this.faces[face.ID] = this.faces[this.faces.length-1];
		this.faces[face.ID].ID = face.ID //Update ID of swapped face
		face.ID = -1;
		this.faces.pop();
		//Remove pointers from all of the face's edges
		for (var i = 0; i < faces.edges.length; i++) {
			edge.removeFace(faces[i]);
		}
	}
	
	//Remove this edge from the list of edges and remove 
	//references to the edge from both of its vertices
	//(NOTE: This function is not responsible for cleaning up
	//faces that may have used this edge; that is up to the client)
	this.removeEdge = function(edge) {
		//Swap the edge to remove with the last edge
		this.edges[edge.ID] = this.edges[this.edges.length-1];
		this.edges[edge.ID].ID = edge.ID; //Update ID of swapped face
		edge.ID = -1;
		this.edges.pop();
		//Remove pointers from the two vertices that make up this edge
		var i = edge.v1.edges.indexOf(edge);
		edge.v1.edges[i] = edge.v1.edges[edge.v1.edges.length-1];
		edge.v1.edges.pop();
		i = edge.v2.edges.indexOf(edge);
		edge.v2.edges[i] = edge.v2.edges[edge.v2.edges.length-1];
		edge.v2.edges.pop();
	}
	
	//Remove this vertex from the list of vertices
	//NOTE: This function is not responsible for cleaning up any of
	//the edges or faces that may have used this vertex
	this.removeVertex = function(vertex) {
		this.vertices[vertex.ID] = this.vertices[this.vertices.length-1];
		this.vertices[vertex.ID].ID = vertex.ID;
		vertex.ID = -1;
		this.vertices.pop();
	}
	
	//Make a clone of this mesh in memory
	this.Clone = function() {
		newMesh = new PolyMesh();
		for (var i = 0; i < this.vertices.length; i++) {
			newMesh.addVertex(this.vertices[i].pos, this.vertices[i].color);
		}
		for (var i = 0; i < this.faces.length; i++) {
			vertices = this.faces[i].getVertices();
			for (var j = 0; j < vertices.length; j++) {
				vertices[j] = newMesh.vertices[vertices[j].ID];
			}
			newMesh.addFace(vertices);
		}
		return newMesh;
	}
	
	
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
	this.loadFile = function(lines) {
		if (lines.length == 0) {
			return;
		}
		var fields = lines[0].match(/\S+/g);
		if (fields[0].toUpperCase() == "OFF" || fields[0].toUpperCase() == "COFF") {
			this.loadOffFile(lines);
		}
		else {
			console.log("Unsupported file type " + fields[0] + " for loading mesh");
		}
		this.needsDisplayUpdate = true;
		this.needsIndexDisplayUpdate = true;
	}	
	
	this.loadOffFile = function(lines) {
		var nVertices = 0;
		var nFaces = 0;
		var nEdges = 0;
		var face = 0;
		var vertex = 0;
		var divideColor = false;
		var fieldNum = 0;
		for (var line = 0; line < lines.length; line++) {
			//http://blog.tompawlak.org/split-string-into-tokens-javascript
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
			if (nVertices == 0) {
				if (fields[0] == "OFF" || fields[0] == "COFF") {
					if (fields.length > 2) {
						nVertices = parseInt(fields[1]);
						nFaces = parseInt(fields[2]);
						nEdges = parseInt(fields[3]);
					}
					if (fields[0] == "COFF") {
						divideColor = true;	
					}	
				}
				else {
					if (fields.length >= 3) {
						nVertices = parseInt(fields[0]);
						nFaces = parseInt(fields[1]);
						nEdges = parseInt(fields[2]);					
					}
					else if (nVertices == 0) {
						console.log("Error parsing OFF file: Not enough fields for nVertices, nFaces, nEdges");
					}
				}
			}
			//Reading vertices
			else if (vertex < nVertices) {
				if (fields.length < 3) {
					console.log("Error parsing OFF File: Too few fields on a vertex line");
					continue;
				}
				P = vec3.fromValues(parseFloat(fields[0]), parseFloat(fields[1]), parseFloat(fields[2]));
				color = null;
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
				this.addVertex(P, color);
				vertex++;
			}
			//Reading faces
			else if (face < nFaces) {
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
					verts[i] = this.vertices[parseInt(fields[i+1])];
				}
				this.addFace(verts);
				face++;
			}
		}
		for (var i = 0; i < this.vertices.length; i++) {
			if (!(this.vertices[i].color === null)) {
				if (this.vertices[i].color[0] > 1) {
					//Rescale colors
					for (var k = 0; k < this.vertices.length; k++) {
						vec3.scale(this.vertices[i].color, this.vertices[i].color, 1.0/255.0);
					}
					break;
				}
			}
		}
		console.log("Succesfully loaded OFF File with " + this.vertices.length + " vertices and " + this.faces.length + " faces");
	}
	
	
	/////////////////////////////////////////////////////////////
	////                     RENDERING                      /////
	/////////////////////////////////////////////////////////////	
	
	//Copy over vertex and triangle information to the GPU
	this.updateBuffers = function(gl) {
		//Check to see if buffers need to be initialized
		if (this.vertexBuffer === null) {
			this.vertexBuffer = gl.createBuffer();
			console.log("New vertex buffer: " + this.vertexBuffer);
		}
		if (this.normalBuffer === null) {
			this.normalBuffer = gl.createBuffer();
		}
		if (this.indexBuffer === null) {
			this.indexBuffer = gl.createBuffer();
		}
		if (this.colorBuffer === null) {
			this.colorBuffer = gl.createBuffer();
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
		var N = new Float32Array(this.vertices.length*3);
		for (var i = 0; i < this.vertices.length; i++) {
			var n = this.vertices[i].getNormal();
			N[i*3] = n[0];
			N[i*3+1] = n[1];
			N[i*3+2] = n[2];
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
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
				C[i*3+1] = 0.7;
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
		gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
		this.indexBuffer.itemSize = 1;
		this.indexBuffer.numItems = 3*NumTris;
	}
	
	//sProg: Shader program, pMatrix: Perspective projection matrix, mvMatrix: Modelview matrix
	//ambientColor, lightingDirection, directionalColor are all vec3s
    this.render = function(gl, sProg, pMatrix, mvMatrix, ambientColor, lightingDirection, directionalColor) {
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
		gl.uniformMatrix4fv(sProg.nMatrixUniform, false, nMatrix);
		
		gl.uniform3fv(sProg.ambientColorUniform, ambientColor);
		gl.uniform3fv(sProg.lightingDirectionUniform, lightingDirection);
		gl.uniform3fv(sProg.directionalColorUniform, directionalColor);
		
		//Step 3: Render the mesh
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0); 
    }
}


