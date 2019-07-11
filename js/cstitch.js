// jessica trabilsie
/*

**TODO**
if performance is an issue move grid lines to separate canvas so dont have to render them multiple times ?

*/

// SVG properties
var aida;
var width;
var height;
const gridSize = 20;

// cross-stitch pattern initialising
var patternWidth;
var patternHeight;
var pattern;

// misc styling
var bgColor = "#EEEEEE";
const gridStyle = "rgba(0,0,0,.2)"; // todo: different grid style for dark backgrounds ie rgba(255,255,255,.2)
var stitchStyle = "red";
var backStyle = "red";
const transparent = "rgba(0,0,0,0)";

// mouse & cursor tile coordinates
var mx;
var my;
var mouseDragging;
var mouseTargetState;
var cursorX;
var cursorY;

function onLoad() {
	aida = document.getElementById("aida");
	width = aida.width;
	height = aida.height;
	
	patternWidth = width/gridSize;
	patternHeight = height/gridSize;
	
	mouseDragging = false;
	mouseTargetState = 0;
	
	pattern = new Array(patternWidth);
	for (var i = 0; i < patternWidth; i++) {
		pattern[i] = new Array(patternHeight);
		for (var j = 0; j < patternHeight; j++) {
			pattern[i][j] = 0;
		}
	}
	
	aida.addEventListener("mousedown", onMouseDown);
	aida.addEventListener("mousemove", onMouseMove);
	aida.addEventListener("mouseleave", onMouseLeave);
	aida.addEventListener("mouseup", onMouseUp);
	aida.addEventListener("contextmenu", onContextMenu);

	mainLoop();
}

function mainLoop() {
	window.requestAnimationFrame(mainLoop); // best practice according to https://developer.mozilla.org/en-US/docs/Games/Anatomy

	update();
	draw();
}

function update() {
	var time = new Date();
	var millis = time.getMilliseconds();

	// Do logic stuff
}

function onMouseDown(evt) {
	evt.preventDefault();
	switch (evt.button) {
		case 0: // lb
			mouseDragging = true;
			mouseTargetState = (pattern[cursorX][cursorY]+1) % 2;
		break;
		case 2: // rb
			evt.preventDefault();
		break;
	}
}

function onMouseMove(evt) {
	// update cursor position
	mx = evt.offsetX
	my = evt.offsetY
	
	cursorX = gridX(mx);
	cursorY = gridY(my);
	
	if (mouseDragging) {
		pattern[cursorX][cursorY] = mouseTargetState;
	}
}

function onMouseLeave(evt) {
	mouseDragging = false;
	// hide cursor
	mx = -gridSize;
	my = -gridSize;
	cursorX = -1;
	cursorY = -1;
}

function onMouseUp(evt) {
	mouseDragging = false;
}

function onContextMenu(evt) {
	evt.preventDefault();
}

function gridX(x0) {
	return Math.min(Math.max(0, Math.floor(x0 / gridSize)), patternWidth-1);
}
function gridY(y0) {
	return Math.min(Math.max(0, Math.floor(y0 / gridSize)), patternHeight-1);
}

function addToPattern(x,y) {
	if (x > 0 && y > 0 && x < patternWidth && y < patternHeight) {
		pattern[x][y] = (++pattern[x][y]) % 2;
	}
}

function draw() {
	drawBg();
	drawGridLines();
	drawStitches();
	drawCursor(cursorX, cursorY);
}

function drawBg() {
	var ctx = aida.getContext('2d');

	ctx.fillStyle = bgColor; // todo: change fill to be picked background colour
	ctx.fillRect(0, 0, width, height);
}

function drawGridLines() {
	var ctx = aida.getContext('2d');

	ctx.strokeStyle = gridStyle;
	ctx.lineWidth = 2;
	
	ctx.beginPath();
	for (var i = 0; i <= width; i += gridSize) {
		ctx.moveTo(i, 0);
		ctx.lineTo(i, height);
	}
	ctx.stroke();
	ctx.beginPath();
	for (var i = 0; i <= height; i += gridSize) {
		ctx.moveTo(0, i);
		ctx.lineTo(width, i);
	}
	ctx.stroke()
}

function drawStitches() {
	var ctx = aida.getContext('2d');
	
	ctx.lineWidth = 2;
	// forward slashes
	ctx.strokeStyle = stitchStyle;
	ctx.beginPath();	
	for (var i = 0; i < patternWidth; i++) {
		for (var j = 0; j < patternWidth; j++) {
			if (pattern[i][j] == 1) {
				ctx.moveTo((i)*gridSize,(j+1)*gridSize);
				ctx.lineTo((i+1)*gridSize,(j)*gridSize);
			}
		}
	}
	ctx.stroke();
	
	// back slashes
	ctx.strokeStyle = backStyle;
	ctx.beginPath();
	for (var i = 0; i < patternWidth; i++) {
		for (var j = 0; j < patternWidth; j++) {
			if (pattern[i][j] == 1) {
				ctx.moveTo((i+1)*gridSize,(j+1)*gridSize);
				ctx.lineTo((i)*gridSize,(j)*gridSize);
			}
		}
	}
	ctx.stroke();
}

function drawCursor(gridX, gridY) {
	var ctx = aida.getContext('2d');
	// hover reticle
	ctx.fillStyle = "rgba(0,0,0,.5)";
	ctx.fillRect(gridX * gridSize, gridY * gridSize, gridSize, gridSize);
}

function testButton() {
	//alert("test");
}

function onBlur(input) {
	switch (input.id) {
		case "col1":
			var val = input.value;
			// fixme
			stitchStyle = input.value;
			if (document.getElementById("lock").checked) {
				document.getElementById("col2").value = val;
				backStyle = stitchStyle;
			}
		break;
		case "col2":
			backStyle = input.value;
		break;
		case "colbg":
			bgColor = input.value;
		break;
	}
}

function lockCheck(input) {
	var col2 = document.getElementById("col2");
	if (input.checked == true) {
		col2.readOnly = true;
		col2.value = document.getElementById("col1").value;
		backStyle = stitchStyle;
	}
	else {
		col2.readOnly = false;
	}
}

function isValidColor(strColor) {
	var s = new Option().style;
	s.color = strColor;

	// return 'false' if color wasn't assigned
	return s.color == strColor.toLowerCase();
}

