// jessica trabilsie
/*

**TODO**
move grid lines to separate canvas so dont have to render them multiple times ?
^ only if performance actually becomes an issue!

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
const bgColor = "#EEEEEE";
const gridStyle = "rgba(0,0,0,.2)";
var stitchStyle = "#FF0000";
const backStyle = "rgb(0,0,255)";
const transparent = "rgba(0,0,0,0)";

// mouse & cursor tile coordinates
var mx;
var my;
var mouseDragging;
var mouseTargetState;
var cursorX;
var cursorY;

// stitching path
var path;

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

	path = planPath(pattern);
}

function planPath(grid) {
	// create empty initial state
	let state = new Array(grid.length); // keeps track of whether each square is empty (0), half (1), or full (2)
	for (let i = 0; i < grid.length; i++) {
		state[i] = new Array(grid[i].length).fill(0);
	}

	let path = [];
	for (let y = 0; y < grid[0].length; y++) {
		for (let x = 0; x < grid.length; x++) {
			if (grid[x][y] === 1) {
				path.push([x,y+1]);
				path.push([x+1,y]);
				path.push([x,y]);
				path.push([x+1,y+1]);
			}
		}
	}

	/*
	// find a place to start stitching
	let path = [];
	for (let y = 0; y < grid[0].length; y++) {
		for (let x = 0; x < grid.length; x++) {
			if (grid[x][y] === 1) {
				path.push([x,y+1]);
				break;
			}
		}
		if (path.length > 0) {
			break;
		}
	}
	if (path.length === 0) {
		return undefined;
	}

	// simple cellular automata that is basically greedy DFS, in direction N-E-W-S
	let cellX = path[0][0];
	let cellY = path[0][1] - 1;
	let overtime = true;
	while (true) {
		let prev = path[path.length - 1];
		let prevX = prev[0];
		let prevY = prev[1];
		if (overtime) {
			switch (state[cellX][cellY]) {
				case 0:
					// under-diagonal
					if (prevX === cellX && prevY === cellY + 1) {
						// bottom left to top right
						path.push([cellX + 1, cellY]);
					} else if (prevX === cellX + 1 && prevY === cellY) {
						// top right to bottom left
						path.push([cellX, cellY + 1]);
					} else {
						console.error("wtf, on wrong hole to do under-diagonal");
					}
					break;
				case 1:
					// over-diagonal
					if (prevX === cellX && prevY === cellY) {
						// top left to bottom right
						path.push([cellX + 1, cellY + 1]);
					} else if (prevX === cellX + 1 && prevY === cellY + 1) {
						// bottom right to top left
						path.push([cellX, cellY]);
					} else {
						console.error("wtf, on wrong hole to do over-diagonal");
					}
					break;
				default:
					console.error("wtf, shouldn't stitch over this cell");
					break;
			}
		} else {
			switch (state[cellX][cellY]) {
				case 1:
					break;
				case 2:
					break;
				default:
					console.error("wtf, shouldn't stitch under this cell");
					break;
			}
		}
		overtime = !overtime;
	}
	 */

	return path;
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
	if (path) {
		drawPath();
	}
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
	
	ctx.strokeStyle = stitchStyle;
	ctx.lineWidth = 2;
	
	// todo: backstitches
	
	ctx.beginPath();	
	for (var i = 0; i < patternWidth; i++) {
		for (var j = 0; j < patternWidth; j++) {
			if (pattern[i][j] == 1) {
				ctx.moveTo((i)*gridSize,(j+1)*gridSize);
				ctx.lineTo((i+1)*gridSize,(j)*gridSize);
				// todo: move this into a separate loop so 2nd stitches are "over" the first ones
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

function drawPath() {
	let ctx = aida.getContext('2d');

	let hue = 0;
	let prev = path[0];
	for (let i = 1; i < path.length; i++) {
		let next = path[i];

		ctx.strokeStyle = `hsl(${hue}, 100%, 40%)`;
		if (i % 2 === 0) {
			ctx.setLineDash([2,2]);
		} else {
			ctx.setLineDash([]);
		}

		ctx.beginPath();
		ctx.moveTo(prev[0] * gridSize, prev[1] * gridSize);
		ctx.lineTo(next[0] * gridSize, next[1] * gridSize);
		ctx.stroke();

		hue = (hue + 1) % 360;
		prev = next;
	}
	ctx.setLineDash([]);
}

function testButton() {
	//alert("test");
}

function onBlur(input) {
	switch (input.id) {
		case "col1":
			var val = input.value;
			// fix it later
			stitchStyle = input.value;
		break;
	}
}

function isValidColor(strColor) {
	var s = new Option().style;
	s.color = strColor;

	// return 'false' if color wasn't assigned
	return s.color == strColor.toLowerCase();
}

