function SimpleMeshCanvas(glcanvas) {
	this.gl = null;
	this.glcanvas = glcanvas;
	this.lastX = 0;
	this.lastY = 0;
	this.dragging = false;
	this.justClicked = false;
	this.camera = new MousePolarCamera(glcanvas.width, glcanvas.height, 0.75);
	this.mesh = new PolyMesh();
	this.glcanvas.MeshCanvas = this;
	
	//Lighting info
	this.ambientColor = vec3.fromValues(0.1, 0.1, 0.1);
	this.lightingDirection = vec3.fromValues(0, 0, 1);
	this.directionalColor = vec3.fromValues(0.5, 0.5, 0.5);
	
	/////////////////////////////////////////////////////
	//Step 1: Setup repaint function
	/////////////////////////////////////////////////////	
	this.repaint = function() {
		console.log(this);
		this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		
		var pMatrix = mat4.create();
		mat4.perspective(pMatrix, 45, this.gl.viewportWidth / this.gl.viewportHeight, this.camera.R/100.0, this.camera.R*2);
		var mvMatrix = this.camera.getMVMatrix();	
		this.mesh.render(this.gl, colorShader, pMatrix, mvMatrix, this.ambientColor, this.lightingDirection, this.directionalColor);		
	}	
	
	/////////////////////////////////////////////////////
	//Step 2: Setup mouse callbacks
	/////////////////////////////////////////////////////
	this.getMousePos = function(evt) {
		var rect = this.glcanvas.getBoundingClientRect();
		return {
		    X: evt.clientX - rect.left,
		    Y: evt.clientY - rect.top
		};
	}
	
	this.releaseClick = function(evt) {
		evt.preventDefault();
		this.MeshCanvas.dragging = false;
		return false;
	} 

	this.makeClick = function(evt) {
		evt.preventDefault();
		this.MeshCanvas.dragging = true;
		this.MeshCanvas.justClicked = true;
		var mousePos = this.MeshCanvas.getMousePos(evt);
		this.MeshCanvas.lastX = mousePos.X;
		this.MeshCanvas.lastY = mousePos.Y;
		return false;
	} 

	//http://www.w3schools.com/jsref/dom_obj_event.asp
	this.clickerDragged = function(evt) {
		evt.preventDefault();
		var mousePos = this.MeshCanvas.getMousePos(evt);
		var dX = mousePos.X - this.MeshCanvas.lastX;
		var dY = mousePos.Y - this.MeshCanvas.lastY;
		this.MeshCanvas.lastX = mousePos.X;
		this.MeshCanvas.lastY = mousePos.Y;
		if (this.dragging) {
			//Translate/rotate shape
			if (evt.button() == 1) { //Center click
				this.MeshCanvas.camera.translate(dX, dY);
			}
			else if (evt.button() == 2) { //Right click
				this.MeshCanvas.camera.zoom(-dY); //Want to zoom in as the mouse goes up
			}
			else if (evt.button() == 0) {
				this.MeshCanvas.camera.orbitLeftRight(dX);
				this.MeshCanvas.camera.orbitUpDown(dY);
			}
		    requestAnimFrame(this.MeshCanvas.repaint);
		}
		return false;
	}	
	
	this.centerCamera = function() {
		this.camera.centerOnMesh(this.mesh);
	}
	
	/////////////////////////////////////////////////////
	//Step 3: Initialize offscreen rendering for picking
	/////////////////////////////////////////////////////
	//https://github.com/gpjt/webgl-lessons/blob/master/lesson16/index.html
	this.pickingFramebuffer = null;
	this.pickingTexture = null;
	this.initPickingFramebuffer = function() {
		this.pickingFramebuffer = this.gl.createFramebuffer();
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pickingFramebuffer);
		this.pickingFramebuffer.width = this.glcanvas.width;
		this.pickingFramebuffer.height = this.glcanvas.height;
		this.pickingTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.pickingTexture);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.pickingFramebuffer.width, this.pickingFramebuffer.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
		var renderbuffer = this.gl.createRenderbuffer();
		this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
		this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.pickingFramebuffer.width, this.pickingFramebuffer.height);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.pickingTexture, 0);
		this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbuffer);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
	}
	
	/////////////////////////////////////////////////////
	//Step 4: Initialize Web GL
	/////////////////////////////////////////////////////
	this.glcanvas.addEventListener('mousedown', this.makeClick);
	this.glcanvas.addEventListener('mouseup', this.releaseClick);
	this.glcanvas.addEventListener('mousemove', this.clickerDragged);

	//Support for mobile devices
	this.glcanvas.addEventListener('touchstart', this.makeClick);
	this.glcanvas.addEventListener('touchend', this.releaseClick);
	this.glcanvas.addEventListener('touchmove', this.clickerDragged);

	try {
	    this.gl = this.glcanvas.getContext("experimental-webgl");
	    this.gl.viewportWidth = this.glcanvas.width;
	    this.gl.viewportHeight = this.glcanvas.height;
	} catch (e) {
		console.log(e);
	}
	if (!this.gl) {
	    alert("Could not initialise WebGL, sorry :-(.  Try a new version of chrome or firefox and make sure your newest graphics drivers are installed");
	}
	initShaders(this.gl, ".");
	this.initPickingFramebuffer();

	this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
	this.gl.enable(this.gl.DEPTH_TEST);
	
	this.gl.useProgram(colorShader);
	this.repaint();
}
