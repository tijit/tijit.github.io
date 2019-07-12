// jessica trabilsie
/*

**TODO**
if performance is an issue move grid lines to separate canvas so dont have to render them multiple times ?

*/

// SVG properties
let aida;
let width;
let height;
const gridSize = 20;

// cross-stitch pattern initialising
let patternWidth;
let patternHeight;
let pattern;

// misc styling
let bgColor = "#EEEEEE";
const gridStyle = "rgba(0,0,0,.2)"; // todo: different grid style for dark backgrounds ie rgba(255,255,255,.2)
let stitchStyle = "red";
let backStyle = "red";
const transparent = "rgba(0,0,0,0)";

// mouse & cursor tile coordinates
let mx;
let my;
let mouseDragging;
let mouseTargetState;
let cursorX;
let cursorY;

// stitching path
let path;

function onLoad() {
	aida = document.getElementById("aida");
	width = aida.width;
	height = aida.height;
	
	patternWidth = width/gridSize;
	patternHeight = height/gridSize;
	
	mouseDragging = false;
	mouseTargetState = 0;
	
	pattern = new Array(patternWidth);
	for (let i = 0; i < patternWidth; i++) {
		pattern[i] = new Array(patternHeight);
		for (let j = 0; j < patternHeight; j++) {
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
	const time = new Date();
	const millis = time.getMilliseconds();

	path = planPath(pattern);
}

function planPath(grid) {
	// create empty initial state
	let state = new Array(grid.length); // 0=banned, 1=needed, 2=half, 3=full
	for (let i = 0; i < grid.length; i++) {
		state[i] = grid[i].slice(); // copy
	}

	// find a place to start stitching
	let start = [];
	for (let y = 0; y < grid[0].length; y++) {
		for (let x = 0; x < grid.length; x++) {
			if (state[x][y] === 1) {
				start = [x, y];
				break;
			}
		}
		if (start.length > 0) {
			break;
		}
	}
	if (start.length === 0) {
		return undefined;
	}

	// Generate order in which to visit cells
	// Cells are visited in a greedy DFS pattern
	const directions = [[0, -1], [+1, 0], [-1, 0], [0, +1]];
	// Each cell will be in the list exactly twice - when it is visited for the first and last time
	let stack = [start];
	let list = [];
	// Initial state
	while (stack.length > 0) {
		let curr = stack[stack.length - 1];

		if (state[curr[0]][curr[1]] === 1) {
			// Just entered this cell for the first time
			state[curr[0]][curr[1]]++;
			list.push(curr);
		}

		// Either just entered, or returned to this cell
		let foundNext = false;
		for (let i = 0; i < directions.length; i++) {
			let dir = directions[i];
			let next = [curr[0] + dir[0], curr[1] + dir[1]];
			if (state[next[0]][next[1]] === 1) {
				// Valid next cell
				foundNext = true;
				stack.push(next);
				break;
			}
		}
		if (foundNext) {
			continue;
		}

		// Nowhere to go, return to parent
		list.push(curr);
		stack.pop();
	}

	return list; // TODO: derive stitch path from the list of cells visited
}

function onMouseDown(evt) {
	evt.preventDefault();
	switch (evt.button) {
		case 0: // lb
			mouseDragging = true;
			mouseTargetState = (pattern[cursorX][cursorY]+1) % 2;
			onMouseMove(evt); // idk if this is valid syntax but idc
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
	
	// todo: if difference between previous cursor position and new position dont touch use a line drawing algorithm to connect them
	
	cursorX = gridX(mx);
	cursorY = gridY(my);
	
	if (mouseDragging) {
		addToPattern(cursorX, cursorY, mouseTargetState);
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

function addToPattern(x, y, state) {
	if (x > 0 && y > 0 && x < patternWidth-1 && y < patternHeight-1) {
		pattern[x][y] = state;
	}
}

function draw() {
	drawBg();
	drawGridLines();
	drawStitches();
	if (path) {
		drawPath();
	}
	drawCursor(cursorX, cursorY);
}

function drawBg() {
	const ctx = aida.getContext('2d');

	ctx.fillStyle = bgColor; // todo: change fill to be picked background colour
	ctx.fillRect(0, 0, width, height);
}

function drawGridLines() {
	const ctx = aida.getContext('2d');

	ctx.strokeStyle = gridStyle;
	ctx.lineWidth = 2;
	
	ctx.beginPath();
	for (let i = 0; i <= width; i += gridSize) {
		ctx.moveTo(i, 0);
		ctx.lineTo(i, height);
	}
	ctx.stroke();
	ctx.beginPath();
	for (let i = 0; i <= height; i += gridSize) {
		ctx.moveTo(0, i);
		ctx.lineTo(width, i);
	}
	ctx.stroke()
}

function drawStitches() {
	const ctx = aida.getContext('2d');

	ctx.lineWidth = 2;
	// forward slashes
	ctx.strokeStyle = stitchStyle;
	ctx.beginPath();	
	for (let i = 0; i < patternWidth; i++) {
		for (let j = 0; j < patternWidth; j++) {
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
	for (let i = 0; i < patternWidth; i++) {
		for (let j = 0; j < patternWidth; j++) {
			if (pattern[i][j] == 1) {
				ctx.moveTo((i+1)*gridSize,(j+1)*gridSize);
				ctx.lineTo((i)*gridSize,(j)*gridSize);
			}
		}
	}
	ctx.stroke();
}

function drawCursor(gridX, gridY) {
	const ctx = aida.getContext('2d');
	// hover reticle
	ctx.fillStyle = "rgba(0,0,0,.5)";
	ctx.fillRect(gridX * gridSize, gridY * gridSize, gridSize, gridSize);
}

function drawPath() {
	let ctx = aida.getContext('2d');
	
	let slider = document.getElementById("animationslider");

	let hue = 180;
	let prev = path[0];
	for (let i = 1; i < path.length * slider.value; i++) {
		let next = path[i];

		ctx.strokeStyle = `hsl(${hue}, 100%, 25%)`;
		if (i % 2 === 0) {
			// ctx.setLineDash([2,2]);
		} else {
			ctx.setLineDash([]);
		}

		ctx.beginPath();
		ctx.moveTo(prev[0] * gridSize + gridSize / 2, prev[1] * gridSize + gridSize / 2);
		ctx.lineTo(next[0] * gridSize + gridSize / 2, next[1] * gridSize + gridSize / 2);
		ctx.stroke();

		hue = (hue + 10) % 360;
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
			const val = input.value;
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
	const col2 = document.getElementById("col2");
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
	const s = new Option().style;
	s.color = strColor;

	// return 'false' if color wasn't assigned
	return s.color == strColor.toLowerCase();
}

