// SVG properties
var aida = document.getElementById("aida");
var width = aida.width.baseVal.value;
var height = aida.height.baseVal.value;
var gridSize = 15;

// cross-stitch pattern initialising (1x1 array)
var patternX = 0;
var patternY = 0;
var patternWidth = width/gridSize;
var patternHeight = height/gridSize;
var pattern = [[0]];

// misc styling
var bgColor = "#EEEEEE";
var gridStyle = "fill:rgba(0,0,0,.2)";

// cursor reticle thing
var cursor;
var mx;
var my;

function onLoad() {
	// bg
	aida.innerHTML = `<rect width="100%" height="100%" fill="${bgColor}" />`; // todo: change fill to be picked background colour
	// grid
	aida.innerHTML += gridLines();
	// hover reticle
	aida.innerHTML += `<rect id="cursor" width="${gridSize}" height="${gridSize}" style="fill:rgba(0,0,0,.5)"></rect>`;
	cursor = aida.getElementById("cursor");
}

function onClick(evt) {
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
	mx = evt.offsetX;
	my = evt.offsetY;
	
	cursor.x.baseVal.value = gridX(mx) * gridSize;
	cursor.y.baseVal.value = gridY(my) * gridSize;
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

function gridLines() {
	var ret = "";
	for (var i = 0; i <= width; i += gridSize) {
		ret += `<rect class="gridline" x="${i-1}" y="0" width="2" height="${height}" style="${gridStyle}"></rect>`;
	}
	for (var i = 0; i <= height; i += gridSize) {
		ret += `<rect class="gridline" x="0" y="${i-1}" width="${width}" height="2" style="${gridStyle}"></rect>`;
	}
	
	return ret;
}
