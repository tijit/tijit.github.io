// SVG properties
var aida = document.getElementById("aida");
var width = aida.width;
var height = aida.height;
var gridSize = 15;

// cross-stitch pattern initialising (1x1 array)
var patternX = 0;
var patternY = 0;
var patternWidth = width/gridSize;
var patternHeight = height/gridSize;
var pattern = [[0]];

// misc styling
var bgColor = "#EEEEEE";
var gridStyle = "rgba(0,0,0,.2)";

function onLoad() {
	// bg
	drawBg();
	// grid
	drawGridLines();
}

function onClick(evt) {
	var mx = evt.offsetX;
	var my = evt.offsetY;

	switch (evt.button) {
		case 0: // lb
			//aida.innerHTML += '<circle cx="'+evt.offsetX+'" cy="'+evt.offsetY+'" r="3" style="fill:rgb(0,0,0)"></circle>';
			// get which box ur in
			addToPattern(gridX(mx),gridY(my));
			
			//aida.innerHTML += '<rect ></rect>';
		break;
		case 2: // rb
			evt.preventDefault();
		break;
	}
}

function onMouseMove(evt) {
	// update cursor position
	drawBg();
	drawGridLines();
	drawCursor(gridX(evt.offsetX), gridY(evt.offsetY));
}

function gridX(x0) {
	return Math.floor(x0 / gridSize);
}
function gridY(y0) {
	return Math.floor(y0 / gridSize);
}

function addToPattern(x,y) {
	// coordinates under minimum - 'bump up' all values
	if (x < 0) {
		for (var i = patternWidth-1; i >= 0; i--) {
			for (var j = 0; j < patternHeight; j++) {
				pattern[i-x,j] = pattern[i,j];
			}
		}
		patternWidth += x;
		x = 0;
	}
	if (y < 0) {
	}
	// coordinates over maximum - fill with zeroes
	if (x > patternWidth) {
		patternWidth = x+1;
	}
	
	pattern[x,y] = 1;
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
	for (var i = 0; i <= width; i += gridSize) {
		ctx.beginPath();
		ctx.moveTo(i-1, 0);
		ctx.lineTo(i-1, height);
		ctx.stroke();
	}
	for (var i = 0; i <= height; i += gridSize) {
		ctx.beginPath();
		ctx.moveTo(0, i-1);
		ctx.lineTo(width, i-1);
		ctx.stroke();
	}
}

function drawCursor(gridX, gridY) {
	var ctx = aida.getContext('2d');

	// hover reticle
	ctx.fillStyle = "rgba(0,0,0,.5)";
	ctx.fillRect(gridX * gridSize, gridY * gridSize, gridSize, gridSize);
}
