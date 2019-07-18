// jessica trabilsie
/*



**TODO**
if performance is an issue move grid lines to separate canvas so dont have to render them multiple times ?

*/
'use strict'; // Enable strict mode, so that some mistakes cause an exception rather than failing silently.

class Point {
	constructor(x, y) {
		this.x_ = x;
		this.y_ = y;
		// TODO: Object.freeze(this)?
	}

	get x() {
		return this.x_;
	}

	get y() {
		return this.y_;
	}

	plus(other) {
		return new Point(this.x_ + other.x_, this.y_ + other.y_);
	}

	minus(other) {
		return new Point(this.x_ - other.x_, this.y_ - other.y_);
	}

	times(scalar) {
		return new Point(scalar * this.x_, scalar * this.y_);
	}

	// aka Manhattan/taxicab length
	get rectilinearLength() {
		return Math.abs(this.x_) + Math.abs(this.y_);
	}

	get isOrthogonal() {
		// returns whether this point is on one of the four orthogonal rays from the origin
		// true for origin point also
		return (this.x_ === 0) || (this.y_ === 0);
	}

	get isDiagonal() {
		// returns whether this point is on one of the four diagonal rays from the origin
		// true for origin point also
		return Math.abs(this.x_) === Math.abs(this.y_);
	}

	get isPerfectStitch() {
		// A perfect stitch is either a short orthogonal stitch, or a short diagonal stitch
		return (this.isOrthogonal && this.rectilinearLength === 1) || (this.isDiagonal && this.rectilinearLength === 2);
	}

	toString() {
		return JSON.stringify({ x: this.x_, y: this.y_ });
	}

	static fromString(str) {
		let obj = JSON.parse(str);
		return new Point(obj.x, obj.y);
	}

	// aka Manhattan/taxicab distance
	static rectilinearDistance(a, b) {
		return a.minus(b).rectilinearLength;
	}

	static* pointsInBox(minX, minY, maxX, maxY) {
		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				yield new Point(x, y);
			}
		}
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

// A map with a default value
class DefaultMap extends Map {
	constructor(defaultValue) {
		super();
		if (defaultValue === undefined) {
			throw "DefaultMap needs a default value";
		}
		this.defaultValue_ = defaultValue;
	}

	set(key, value) {
		if (value === this.defaultValue_) {
			super.delete(key);
		} else {
			super.set(key, value);
		}
		return this;
	}

	get(key) {
		if (super.has(key)) {
			return super.get(key);
		} else {
			return this.defaultValue_;
		}
	}
}

// A map where the keys are Points.
class Grid {
	constructor(defaultValue) {
		this.map_ = new DefaultMap(defaultValue);
	}

	set(key, value) {
		return this.map_.set(key.toString(), value);
	}

	get(key) {
		return this.map_.get(key.toString());
	}

	has(key) {
		return this.map_.has(key.toString());
	}

	get size() {
		return this.map_.size;
	}
}

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
	
	pattern = new Grid(0);

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
	// find a place to start stitching // TODO: Allow user to specify this
	let start = undefined;
	for (let pos of Point.pointsInBox(0, 0, patternWidth - 1, patternHeight - 1)) {
		if (grid.get(pos) === 1) {
			start = pos;
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
	let visitCount = new Grid(0);
	let stack = [start];
	let cellList = []; // each element is [cellPoint, s], where s is 1 (under-diagonal) or 2 (over-diagonal)
	// Initial state
	while (stack.length > 0) {
		let curr = stack[stack.length - 1];

		if (visitCount.get(curr) === 0) {
			// Just entered this cell for the first time
			visitCount.set(curr,  1);
			cellList.push([curr, 1]);
		}

		// Either just entered, or returned to this cell
		let foundNext = false;
		for (let i = 0; i < directions.length; i++) {
			let dir = directions[i];
			let next = curr.plus(dir);
			if (grid.get(next) === 1 && visitCount.get(next) === 0) {
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

	if (!isValidCellList(cellList)) {
		throw "Somehow an invalid cell list was generated";
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

	if (!isValidHoleList(holeList)) {
		throw "Somehow an invalid hole list was generated";
	}

	return holeList;
}

// cellList must have format [[point, s], [point, s], ...], where s is 1 for under-diagonals and 2 for over-diagonals
function isValidCellList(cellList) {
	let visitCount = new Grid(0);

	for (let i = 0; i < cellList.length; i++) {
		let currCell = cellList[i][0];
		let currStitch = cellList[i][1];
		switch (currStitch) {
			case 1:
				// This should be the first time the cell is visited
				if (visitCount.has(currCell)) {
					return false;
				}
				break;
			case 2:
				// This should be the second time the cell is visited
				if (!visitCount.has(currCell) || (visitCount.get(currCell) !== 1)) {
					return false;
				}
				break;
			default:
				// Stitch must be 1 or 2
				return false;
		}
		visitCount.set(currCell, currStitch);

		if (i === 0) {
			continue;
		}

		let prevCell = cellList[i - 1][0];
		let prevStitch = cellList[i - 1][1];
		let dist = Point.rectilinearDistance(prevCell, currCell);
		if (prevStitch === currStitch) {
			// over-diagonal twice, or under-diagonal twice. must be on adjacent cells.
			if (dist !== 1) {
				return false;
			}
		} else if (prevStitch === 1 && currStitch === 2) {
			// under-diagonal then over-diagonal. must be on same cell.
			if (dist !== 0) {
				return false;
			}
		} else if (prevStitch === 2 && currStitch === 1) {
			// over-diagonal then under-diagonal, cells must be a distance 2 from each other.
			if (dist !== 2) {
				return false;
			}
		}
	}

	// TODO: Check that every cell has been visited exactly zero or two times

	return true;
}

// hole must be an array of points, representing the order to visit the holes
// checks that stitches are unit length and alternate between in-front-of-canvas (diagonal) and behind-canvas (orthogonal)
// does not check whether under-diagonals are done before over-diagonals, or whether every cell has two stitches
function isValidHoleList(holeList) {
	for (let i = 1; i < holeList.length; i++) {
		let stitch = holeList[i].minus(holeList[i - 1]);
		if (i % 2 === 1) {
			// First stitch (and every second stitch) must be diagonal
			if (!stitch.isDiagonal) {
				return false;
			}
		} else {
			// Second stitch (and every second stitch) must be orthogonal
			if (!stitch.isOrthogonal) {
				return false;
			}
		}
		// Every stitch must be "perfect" (short)
		if (!stitch.isPerfectStitch) {
			return false;
		}
	}

	return true;
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
			mouseTargetState = (pattern.get(cursorPos)+1) % 2;
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
	pattern.set(point, state);
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
	for (let pos of Point.pointsInBox(0, 0, patternWidth - 1, patternHeight - 1)) {
		if (pattern.get(pos) === 1) {
			ctx.moveTo((pos.x)*gridSize,(pos.y+1)*gridSize);
			ctx.lineTo((pos.x+1)*gridSize,(pos.y)*gridSize);
		}
	}
	ctx.stroke();
	
	// back slashes
	ctx.strokeStyle = backStyle;
	ctx.beginPath();
	for (let pos of Point.pointsInBox(0, 0, patternWidth - 1, patternHeight - 1)) {
		if (pattern.get(pos) === 1) {
			ctx.moveTo((pos.x+1)*gridSize,(pos.y+1)*gridSize);
			ctx.lineTo((pos.x)*gridSize,(pos.y)*gridSize);
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


