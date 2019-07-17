// jessica trabilsie
/*



**TODO**
if performance is an issue move grid lines to separate canvas so dont have to render them multiple times ?

*/

class Point {
	constructor(x=0, y=0) {
		this._x = x;
		this._y = y;
	}

	get x() {
		return this._x;
	}

	get y() {
		return this._y;
	}

	set x(val) {
		throw "Points are immutable - setting x directly is not allowed.";
	}

	set y(val) {
		throw "Points are immutable - setting y directly is not allowed.";
	}

	plus(other) {
		return new Point(this._x + other._x, this._y + other._y);
	}

	minus(other) {
		return new Point(this._x - other._x, this._y - other._y);
	}

	times(scalar) {
		return new Point(scalar * this._x, scalar * this._y);
	}

	get rectilinearLength() {
		// noinspection JSSuspiciousNameCombination
		return Math.abs(this._x) + Math.abs(this._y);
	}

	// aka Manhattan/taxicab distance
	static rectilinearDistance(a, b) {
		return a.minus(b).rectilinearLength;
	}
}
Point.Zero = new Point(0, 0);
Point.Offscreen = new Point(-1, -1);
Point.N = new Point(0, -1);
Point.S = new Point(0, +1);
Point.W = new Point(-1, 0);
Point.E = new Point(+1, 0);
Point.NW = Point.N.plus(Point.W);
Point.NE = Point.N.plus(Point.E);
Point.SW = Point.S.plus(Point.W);
Point.SE = Point.S.plus(Point.E);

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
let mousePos = new Point();
let mouseDragging;
let mouseTargetState;
let cursorPos = new Point();

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
	// TODO: Make and use a util function to copy 2d arrays
	let state = new Array(grid.length); // 0=banned, 1=needed, 2=half, 3=full // TODO: Use enum?
	for (let i = 0; i < grid.length; i++) {
		state[i] = grid[i].slice(); // .slice is javascript way to (shallow) copy
	}

	// find a place to start stitching // TODO: Allow user to specify this
	let start = undefined;
	for (let y = 0; y < grid[0].length; y++) {
		for (let x = 0; x < grid.length; x++) {
			if (state[x][y] === 1) {
				start = new Point(x, y);
				break;
			}
		}
		if (start !== undefined) {
			break;
		}
	}
	if (start === undefined) {
		return undefined; // TODO: Learn whether 'undefined' is good practice
	}

	// Generate order in which to visit cells
	// Cells are visited in a greedy DFS pattern
	const directions = [Point.N, Point.E, Point.W, Point.S]; // TODO: Change order?
	// Each cell will be in the list exactly twice - when it is visited for the first and last time
	let stack = [start];
	let cellList = []; // each element is [cellPoint, s], where s is 1 (under-diagonal) or 2 (over-diagonal)
	// Initial state
	while (stack.length > 0) {
		let curr = stack[stack.length - 1];

		if (state[curr.x][curr.y] === 1) {
			// Just entered this cell for the first time
			state[curr.x][curr.y] = 2;
			cellList.push([curr, 1]);
		}

		// Either just entered, or returned to this cell
		let foundNext = false;
		for (let i = 0; i < directions.length; i++) {
			let dir = directions[i];
			let next = curr.plus(dir);
			// TODO: Check whether next is in bounds of grid
			if (state[next.x][next.y] === 1) {
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
		cellList.push([curr, 2]);
		stack.pop();
	}

	// Turn the list of cells to visit into a list of holes to visit
	let holeList = new Array(2 * cellList.length); // Hole count is twice the cell-visit count
	// Find everywhere in the sequence that does an over-diagonal (2) then an under-diagonal (1)
	let prevDiagType = 2; // Ensures beginning of sequence is treated as 2,1
	for (let cellI = 0; cellI <= /* intentional! */ cellList.length; cellI++) {
		let nextDiagType = 1; // Ensures end of sequence is treated as 2,1
		if (cellI < cellList.length) {
			nextDiagType = cellList[cellI][1];
		}

		if (prevDiagType === 2 && nextDiagType === 1) {
			// Found an over-then-under sequence, which tends to constrain which holes will be valid
			let prevI;
			let currI;
			let prevCell;
			let currCell;

			// Start at the over-diagonal and work backward until reaching an under-diagonal
			prevI = cellI;
			currI = prevI - 1;
			while (currI >= 0 && cellList[currI][1] === 2) {
				currCell = cellList[currI][0];
				prevCell = currCell;
				if (0 <= prevI && prevI < cellList.length) {
					prevCell = cellList[prevI][0];
				}

				let currHoles = overDiagHoles(currCell);
				let dist = Point.rectilinearDistance(currCell, prevCell);
				if (dist === 2 || dist === 0) {
					// Tricky case that constrains hole order a lot
					let prevHoles = underDiagHoles(prevCell);
					let prevHole;
					if (cellHoleDistance(currCell, prevHoles[0]) <= 1) {
						prevHole = prevHoles[0];
					} else {
						prevHole = prevHoles[1];
					}

					if (cellHoleDistance(currCell, prevHole) === 0) {
						// Previous hole is on this cell, so we can choose either order // TODO: make option
						holeList[2 * currI + 1] = currHoles[0];
						holeList[2 * currI] = currHoles[1];
					} else {
						// Previous hole not on cell, so order is forced
						if (Point.rectilinearDistance(prevHole, currHoles[0]) === 1) {
							holeList[2 * currI + 1] = currHoles[0];
							holeList[2 * currI] = currHoles[1];
						} else {
							holeList[2 * currI + 1] = currHoles[1];
							holeList[2 * currI] = currHoles[0];
						}
					}
				} else {
					// Easy case that doesn't constrain hole order much
					let prevHole = holeList[2 * prevI];
					if (cellHoleDistance(currCell, prevHole) === 0) {
						// Previous hole is on this cell, so we can choose either order // TODO: make option
						holeList[2 * currI + 1] = currHoles[0];
						holeList[2 * currI] = currHoles[1];
					} else {
						// Previous hole not on cell, so order is forced
						if (Point.rectilinearDistance(prevHole, currHoles[0]) === 1) {
							holeList[2 * currI + 1] = currHoles[0];
							holeList[2 * currI] = currHoles[1];
						} else {
							holeList[2 * currI + 1] = currHoles[1];
							holeList[2 * currI] = currHoles[0];
						}
					}
				}

				prevI = currI;
				currI -= 1;
			}

			// Start at the under-diagonal and work forward until reaching an over-diagonal
			prevI = cellI - 1;
			currI = prevI + 1;
			while (currI < cellList.length && cellList[currI][1] === 1) {
				currCell = cellList[currI][0];
				prevCell = currCell;
				if (0 <= prevI && prevI < cellList.length) {
					prevCell = cellList[prevI][0];
				}

				let currHoles = underDiagHoles(currCell);
				let dist = Point.rectilinearDistance(currCell, prevCell);
				if (dist === 2 || dist === 0) {
					// Tricky case that constrains hole order a lot
					let prevHoles = overDiagHoles(prevCell);
					let prevHole;
					if (cellHoleDistance(currCell, prevHoles[0]) <= 1) {
						prevHole = prevHoles[0];
					} else {
						prevHole = prevHoles[1];
					}

					if (cellHoleDistance(currCell, prevHole) === 0) {
						// Previous hole is on this cell, so we can choose either order // TODO: make option
						holeList[2 * currI] = currHoles[0];
						holeList[2 * currI + 1] = currHoles[1];
					} else {
						// Previous hole not on cell, so order is forced
						if (Point.rectilinearDistance(prevHole, currHoles[0]) === 1) {
							holeList[2 * currI] = currHoles[0];
							holeList[2 * currI + 1] = currHoles[1];
						} else {
							holeList[2 * currI] = currHoles[1];
							holeList[2 * currI + 1] = currHoles[0];
						}
					}
				} else {
					// Easy case that doesn't constrain hole order much
					let prevHole = holeList[2 * prevI + 1];
					if (cellHoleDistance(currCell, prevHole) === 0) {
						// Previous hole is on this cell, so we can choose either order // TODO: make option
						holeList[2 * currI] = currHoles[0];
						holeList[2 * currI + 1] = currHoles[1];
					} else {
						// Previous hole not on cell, so order is forced
						if (Point.rectilinearDistance(prevHole, currHoles[0]) === 1) {
							holeList[2 * currI] = currHoles[0];
							holeList[2 * currI + 1] = currHoles[1];
						} else {
							holeList[2 * currI] = currHoles[1];
							holeList[2 * currI + 1] = currHoles[0];
						}
					}
				}

				prevI = currI;
				currI += 1;
			}
		}

		prevDiagType = nextDiagType;
	}


	return holeList;
}

// returns the distance between a cell coord and a hole coord - zero if it is one of the four holes on the cell border
function cellHoleDistance(cell, hole) {
	let holeToLeft = (hole.x <= cell.x);
	let holeAbove = (hole.y <= cell.y);
	if (holeToLeft) {
		if (holeAbove) {
			return Point.rectilinearDistance(hole, cell);
		} else {
			return Point.rectilinearDistance(hole, cell.plus(Point.S));
		}
	} else {
		if (holeAbove) {
			return Point.rectilinearDistance(hole, cell.plus(Point.E));
		} else {
			return Point.rectilinearDistance(hole, cell.plus(Point.SE));
		}
	}
}

function overDiagHoles(cell) {
	return [
		cell,
		cell.plus(Point.SE)
	];
}

function underDiagHoles(cell) {
	return [
		cell.plus(Point.E),
		cell.plus(Point.S)
	];
}

function onMouseDown(evt) {
	evt.preventDefault();
	switch (evt.button) {
		case 0: // lb
			mouseDragging = true;
			mouseTargetState = (pattern[cursorPos.x][cursorPos.y]+1) % 2;
			onMouseMove(evt); // idk if this is valid syntax but idc
		break;
		case 2: // rb
			evt.preventDefault();
		break;
	}
}

function onMouseMove(evt) {
	// update cursor position
	mousePos = new Point(evt.offsetX, evt.offsetY);

	// todo: if difference between previous cursor position and new position dont touch use a line drawing algorithm to connect them

	cursorPos = gridPoint(mousePos);

	if (mouseDragging) {
		addToPattern(cursorPos, mouseTargetState);
	}
}

function onMouseLeave(evt) {
	mouseDragging = false;
	// hide cursor
	mousePos = Point.Offscreen.times(gridSize);
	cursorPos = Point.Offscreen;
}

function onMouseUp(evt) {
	mouseDragging = false;
}

function onContextMenu(evt) {
	evt.preventDefault();
}

function gridPoint(mousePoint) {
	return new Point(
		Math.min(Math.max(0, Math.floor(mousePoint.x / gridSize)), patternWidth-1),
		Math.min(Math.max(0, Math.floor(mousePoint.y / gridSize)), patternHeight-1)
	);
}

function addToPattern(point, state) {
	if (point.x > 0 && point.y > 0 && point.x < patternWidth-1 && point.y < patternHeight-1) {
		pattern[point.x][point.y] = state;
	}
}

function draw() {
	drawBg();
	drawGridLines();
	drawStitches();
	if (path) {
		drawPath();
	}
	drawCursor(cursorPos);
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
			if (pattern[i][j] === 1) {
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
			if (pattern[i][j] === 1) {
				ctx.moveTo((i+1)*gridSize,(j+1)*gridSize);
				ctx.lineTo((i)*gridSize,(j)*gridSize);
			}
		}
	}
	ctx.stroke();
}

function drawCursor(gridPoint) {
	const ctx = aida.getContext('2d');
	// hover reticle
	ctx.fillStyle = "rgba(0,0,0,.5)";
	ctx.fillRect(gridPoint.x * gridSize, gridPoint.y * gridSize, gridSize, gridSize);
}

function drawPath() {
	let ctx = aida.getContext('2d');
	
	let slider = document.getElementById("animationslider");

	let prev = path[0];
	for (let i = 1; i < path.length * slider.value; i++) {
		let next = path[i];

		ctx.strokeStyle = 'black';
		if (i % 2 === 0) {
			ctx.setLineDash([2,2]);
		} else {
			ctx.setLineDash([]);
		}

		ctx.beginPath();
		ctx.moveTo(prev.x * gridSize, prev.y * gridSize);
		ctx.lineTo(next.x * gridSize, next.y * gridSize);
		ctx.stroke();

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
	if (input.checked === true) {
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
	return s.color === strColor.toLowerCase();
}


