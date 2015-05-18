//TODO: Figure out how to jointly require gl-matrix-min.js

function MeshVertex(P, ID) {
	this.pos = P;
	this.texCoords = [0.0, 0.0];
	this.ID = ID;
	this.edges = [];
	this.component = -1;//Which connected component it's in
	
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
	
	this.getNormal() {
		if (this.normal === null) {
			
		}
		return this.normal;
	}
}

//Shape Objects
function PolyMesh() {
	
	
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


