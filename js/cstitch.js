// svgElement.style.setProperty
var aida = document.getElementById("aida");
var width = aida.width.baseVal.value;
var height = aida.height.baseVal.value;
//aida.viewBox = "0 0 "+width+" "+height;
var gridSize = 16;

var patternX = 0;
var patternY = 0;
var patternWidth = 1;
var patternHeight = 1;
var pattern = [[1]];


// camera position
camX = -40;
camY = 0;
zoomFactor = 1;

var bgColor = "#EEEEEE";
var gridStyle = "fill:rgba(0,0,0,.2)";

function onLoad() {
	// define the grid
	aida.innerHTML = '<rect width="100%" height="100%" fill="'+bgColor+'" />'; // todo: change fill to be picked background colour
	aida.innerHTML += gridLines();
}

function onClick(evt) {
	switch (evt.button) {
		case 0: // lb
			//aida.innerHTML += '<circle cx="'+evt.offsetX+'" cy="'+evt.offsetY+'" r="3" style="fill:rgb(0,0,0)"></circle>';
			// get which box ur in
			var x0 = Math.floor((evt.offsetX-camX) / gridSize);
			var y0 = Math.floor(evt.offsetY / gridSize);
			
			addToPattern(x0,y0);
			
			//aida.innerHTML += '<rect ></rect>';
		break;
		case 2: // rb
			evt.preventDefault();
		break;
	}
}

function addToPattern(x, y) {
	// coordinates under minimum - bump up all values
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
	if (x > patternWidth) {
		patternWidth = x+1;
	}
	
	pattern[x,y] = 1;
	
	
}

function gridLines() {
	var ret = "";
	for (var i = -camX; i <= -camX+width; i += gridSize) {
		ret += '<rect id="gridline" x="'+(i-1)+'" y="0" width="2" height="'+height+'" style="fill:rgba(0,0,0,.2)"></rect>';
	}
	for (var i = camY; i <= camY+height; i += gridSize) {
		ret += '<rect id="gridline" x="0" y="'+(i-1)+'" width="'+width+'" height="2" style="'+gridStyle+'"></rect>';
	}
	
	return ret;
}
