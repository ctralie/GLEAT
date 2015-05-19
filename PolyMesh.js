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
		if (edges[i].vertexAcross(v1) === v2) {
			return e;
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

//Shape Objects
function PolyMesh() {
	this.vertices = [];
	this.edges = [];
	this.faces = [];
	this.components = [];
	
	
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
		var verts = Array(meshVerts.length);
		for (var i = 0; i < verts.length; i++) {
			verts[i] = verts[i].pos;
		}
		if (!arePlanar(verts)) {
			console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not planar\n")
			for (var i = 0; i < verts.length; i++) {
				console.log(vecStr(verts[i]) + ", ");
			}
			return null;
		}
		if (!are2DConvex(verts)) {
			console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not convex\n");
			return null;
		}
		var face = new MeshFace(this.faces.length);
		face.startV = meshVerts[0];
		for (var i = 0; i < meshVerts.length; i++) {
			var v1 = meshVerts[i];
			var v2 = meshVerts[(i+1)%len(meshVerts)];
			var edge = this.getEdgeInCommon(v1, v2);
			if (edge === null) {
				edge = this.addEdge(v1, v2);
			}
			face.edges.push(edge);
			edge.addFace(face, v1); //Add pointer to face from edge
		}
		this.faces.append(face);
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
	////                INPUT/OUTPUT METHODS                /////
	/////////////////////////////////////////////////////////////
	this.loadFile = function(lines) {
		if (fields[0].toUpperCase() == "OFF" || fields[0].toUpperCase() == "COFF") {
			this.loadOffFile(fields);
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
		var lineCount = 0;
		var face = 0;
		var vertex = 0;
		var divideColor = false;
		var fieldNum = 0;
		/*for line in fin:
			lineCount = lineCount+1
			fields = line.split() #Splits whitespace by default
			if len(fields) == 0: #Blank line
				continue
			if fields[0][0] in ['#', '\0', ' '] or len(fields[0]) == 0:
				continue
			#Check section
			if nVertices == 0:
				if fields[0] == "OFF" or fields[0] == "COFF":
					if len(fields) > 2:
						fields[1:4] = [int(field) for field in fields]
						[nVertices, nFaces, nEdges] = fields[1:4]		
					if fields[0] == "COFF":
						divideColor = True			
				else:
					fields[0:3] = [int(field) for field in fields]
					[nVertices, nFaces, nEdges] = fields[0:3]
			elif vertex < nVertices:
				fields = [float(i) for i in fields]
				P = Point3D(fields[0],fields[1], fields[2])
				color = None
				if len(fields) >= 6:
					#There is color information
					if divideColor:
						color = [float(c)/255.0 for c in fields[3:6]]
					else:
						color = [float(c) for c in fields[3:6]]
				self.addVertex(P, color)
				vertex = vertex+1
			elif face < nFaces:
				#Assume the vertices are specified in CCW order
				fields = [int(i) for i in fields]
				meshVerts = fields[1:fields[0]+1]
				verts = [self.vertices[i] for i in meshVerts]
				self.addFace(verts)
				face = face+1
		fin.close()
		for v in self.vertices:
			if v.color:
				if v.color[0] > 1:
					#Rescale colors
					for v2 in self.vertices:
						v2.color = [a/255.0 for a in v2.color]
					break*/
	}
	
	
    this.render = function(sProg, ID) {
        gl.bindBuffer(gl.ARRAY_BUFFER, hemisphereVertexPosBuffer);
        gl.vertexAttribPointer(sProg.vPosAttrib, hemisphereVertexPosBuffer.itemSize, gl.FLOAT, false, 0, 0);
	    gl.bindBuffer(gl.ARRAY_BUFFER, hemisphereTexCoordBuffer);
	    gl.vertexAttribPointer(sProg.texCoordAttrib, hemisphereTexCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, texture);
	    gl.uniform1i(sProg.samplerUniform, 0);
        gl.uniform1f(sProg.IDUniform, ID);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, hemisphereIdxBuffer);
        
        //Scale, translate, and rotate the sphere appropriately on top of whatever world transformation
        //has already been passed along in mvMatrix
        this.body.getMotionState().getWorldTransform(trans);
        var x = trans.getOrigin().x();
        var y = trans.getOrigin().y();
        var z = trans.getOrigin().z();
        var q = trans.getRotation();
        var TR = mat4.create();
        mat4.identity(TR);
        mat4.translate(TR, [x, y, z]);
        var quatMat = mat4.create();
        quat4.toMat4([0, 0, 0, 1], quatMat);
        TR = mat4.multiply(TR, quatMat);
        var S = mat4.create();
        mat4.identity(S);
        mat4.scale(S, [this.radius, this.radius, this.radius]);
        //Modelview matrix for top half of sphere: M = mvMatrix*T*R*S
        mvPushMatrix();
        mat4.scale(S, [-1, 1, 1]);
        mvMatrix = mat4.multiply(mvMatrix, TR);
        mvMatrix = mat4.multiply(mvMatrix, S);
        setMatrixUniforms(sProg);
        gl.drawElements(gl.TRIANGLES, hemisphereIdxBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        mvPopMatrix();
        
        
        mvPushMatrix();
        mat4.scale(S, [-1, 1, -1]);//Bottom half needs to be flipped around the Z-axis
        mvMatrix = mat4.multiply(mvMatrix, TR);
        mvMatrix = mat4.multiply(mvMatrix, S);
        setMatrixUniforms(sProg);
        gl.drawElements(gl.TRIANGLES, hemisphereIdxBuffer.numItems, gl.UNSIGNED_SHORT, 0);        
        mvPopMatrix();
    }
}


