

	    var gl;

	    function initGL(canvas) {
	        try {
	            gl = canvas.getContext("experimental-webgl");
	            gl.viewportWidth = canvas.width;
	            gl.viewportHeight = canvas.height;
	        } catch (e) {
	        }
	        if (!gl) {
	            alert("Could not initialise WebGL, sorry :-(");
	        }
	    }


	    function getShader(gl, id) {
	        var shaderScript = document.getElementById(id);
	        if (!shaderScript) {
	            return null;
	        }

	        var str = "";
	        var k = shaderScript.firstChild;
	        while (k) {
	            if (k.nodeType == 3) {
	                str += k.textContent;
	            }
	            k = k.nextSibling;
	        }

	        var shader;
	        if (shaderScript.type == "x-shader/x-fragment") {
	            shader = gl.createShader(gl.FRAGMENT_SHADER);
	        } else if (shaderScript.type == "x-shader/x-vertex") {
	            shader = gl.createShader(gl.VERTEX_SHADER);
	        } else {
	            return null;
	        }

	        gl.shaderSource(shader, str);
	        gl.compileShader(shader);

	        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	            alert(gl.getShaderInfoLog(shader));
	            return null;
	        }

	        return shader;
	    }


	    var shaderProgram;

	    function initShaders() {
	        var fragmentShader = getShader(gl, "shader-fs");
	        var vertexShader = getShader(gl, "shader-vs");

	        shaderProgram = gl.createProgram();
	        gl.attachShader(shaderProgram, vertexShader);
	        gl.attachShader(shaderProgram, fragmentShader);
	        gl.linkProgram(shaderProgram);

	        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	            alert("Could not initialise shaders");
	        }

	        gl.useProgram(shaderProgram);

	        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	        shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	    }


	    var mvMatrix = mat4.create();
	    var pMatrix = mat4.create();

	    function setMatrixUniforms() {
	        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	    }

	    var triangleVertexPositionBuffer;
	    var triangleVertexColorBuffer;
	    var squareVertexPositionBuffer;
	    var squareVertexColorBuffer;

	    var displayCoords;

	    function initBuffers() {

	        //Create a stripped-down 2D array version of pestData that Delaunay.js can handle.
	        var pestDataStripped = [];
	        for(var i = 0; i < pestData.length; i++) {
	            pestDataStripped[i] = [pestData[i].x, pestData[i].y];
	        }

	        //Delaunay.triangulate(data) returns an array of the indexes of triangle points within (data)
	        var vertexIndexes = Delaunay.triangulate(pestDataStripped);

	        triangleVertexPositionBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
	        
	        //Put the xyz coordinates of each vertex (in sets of three vertices) into an array to be turned into triangles.
	        var vertices = [];
	        var newVertex;
	        for(var i = 0; i < vertexIndexes.length; i++) {
	            newVertex = [pestData[vertexIndexes[i]].x, pestData[vertexIndexes[i]].y, 0];
	            vertices = vertices.concat(newVertex);
	        }


	        // Temporary - set up some display coordinates so I can see the data in a useful way.
	        /*
	        displayCoords = {
	            xMin: pestData[0].x,
	            xMax: pestData[0].x,
	            yMin: pestData[0].y,
	            yMax: pestData[0].y,
	        }

	        for(var i = 0; i < pestData.length; i++) {
	            if(pestData[i].x < displayCoords.xMin) {
	                displayCoords.xMin = pestData[i].x;
	            }

	            if(pestData[i].x > displayCoords.xMax) {
	                displayCoords.xMax = pestData[i].x;
	            }
	            if(pestData[i].y < displayCoords.yMin) {
	                displayCoords.yMin = pestData[i].y;
	            }

	            if(pestData[i].y > displayCoords.yMax) {
	                displayCoords.yMax = pestData[i].y;
	            }
	        }

	        var xDelta = Math.abs(displayCoords.xMin - displayCoords.xMax);
	        var yDelta = Math.abs(displayCoords.yMin - displayCoords.yMax);

	        displayCoords.xMin -= xDelta / 4;
	        displayCoords.xMax += xDelta / 4;
	        displayCoords.yMin -= yDelta / 4;
	        displayCoords.yMax += yDelta / 4;
	        */


	        //Temp - just toning down the colors so they're useful grayscale values.
	        var colorNormalize = 0;
	        for(var i = 0; i < pestData.length; i++) {
	            if(pestData[i].severity > colorNormalize) {
	                colorNormalize = pestData[i].severity;
	            }
	        }

	        //console.log(colorNormalize);
	        /*
	        var vertices = [
	             0.0,  1.0,  0.0,
	            -1.0, -1.0,  0.0,
	             1.0, -1.0,  0.0,
	             0.0,  1.0,  0.0,
	            -1.0, -1.0,  0.0,
	             1.0, 1.0,  0.0
	        ];
	        */

	        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	        triangleVertexPositionBuffer.itemSize = 3;
	        triangleVertexPositionBuffer.numItems = vertexIndexes.length;

	        triangleVertexColorBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
	        
	        //Eventually, combine this into the above loop. Just separating them now for clarity.
	        //Put the rgba coordinates of each vertex 
	        var colors = [];
	        var newColor;
	        var severity;
	        for(var i = 0; i < vertexIndexes.length; i++) {

	            //Note: This works for now with the small set of data. In the future, this will need to be normalized.
	            severity = pestData[vertexIndexes[i]].severity / colorNormalize;

	            newColor = [severity, severity, severity, 1];
	            colors = colors.concat(newColor);
	        }

	        /*
	        var colors = [
	            1.0, 0.0, 0.0, 1.0,
	            0.0, 1.0, 0.0, 1.0,
	            0.0, 0.0, 1.0, 1.0,            
	            1.0, 0.0, 0.0, 1.0,
	            0.0, 1.0, 0.0, 1.0,
	            0.0, 0.0, 1.0, 1.0
	        ];
	        */

	        console.log(pestDataStripped.length);

	        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	        triangleVertexColorBuffer.itemSize = 4;
	        triangleVertexColorBuffer.numItems = vertexIndexes.length;

	        /*
	        squareVertexPositionBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
	        vertices = [
	             1.0,  1.0,  0.0,
	            -1.0,  1.0,  0.0,
	             1.0, -1.0,  0.0,
	            -1.0, -1.0,  0.0
	        ];
	        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	        squareVertexPositionBuffer.itemSize = 3;
	        squareVertexPositionBuffer.numItems = 4;

	        squareVertexColorBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
	        colors = [];
	        for (var i=0; i < 4; i++) {
	            colors = colors.concat([0.5, 0.5, 1.0, 1.0]);
	        }
	        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	        squareVertexColorBuffer.itemSize = 4;
	        squareVertexColorBuffer.numItems = 4;
	        */
	    }

	    // A temp variable, just used to start visualizing this 
	   
	    function drawScene() {

	        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	        gl.clearColor(0, 0, 0, 0);
	        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	        //Switching to orthographic perspective. 
	        //mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

	        //These will eventually correspond to the viewport? i.e. 0, 640, 0, 480

	        //Find the largest and smallest x and y values.
	        //Find the largest difference, x or y.
	        //Find the centers of the two ranges.
	        //Difference out from each of those. 
	        //Bingo.

	        /*
	        displayCoords = {
	            xMin: 35.32,
	            xMax: 35.35,
	            yMin: -118.88,
	            yMax: -118.85
	        };
	        */


	        mat4.ortho(overlayBorders.w, overlayBorders.e, overlayBorders.s, overlayBorders.n, -10, 10, pMatrix);
	        mat4.identity(mvMatrix);

	        //Position
	        //Maybe use a z-translate to deal with scaling for maps?
	        mat4.translate(mvMatrix, [0, 0, -5.0]);
	        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
	        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	        //Color
	        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
	        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	        //Draw the triangle.
	        setMatrixUniforms();
	        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);

	        /*
	        mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);
	        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
	        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
	        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
	       
	        setMatrixUniforms();
	        gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
	        */
	    }



	    function webGLStart() {
	        var canvas = document.getElementById("myCanvas");
	        initGL(canvas);
	        initShaders();
	        initBuffers();

	        gl.clearColor(0.0, 0.0, 0.0, 1.0);
	        gl.enable(gl.DEPTH_TEST);

	        drawScene();
	    }
