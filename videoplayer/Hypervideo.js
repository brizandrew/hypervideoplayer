function Hypervideo( config ){

	if(typeof config !== "object")
		throw new Error("Hypervideo: expecting a config object");

	if(typeof config.path !== "string")
		throw new Error("Hypervideo: path expecting a vido path ")

	this._src = config.path; 
	
	this._ele = null; // parent container ( probably a div )
	this._vid = null; // video element
	this._list = []; // array of elemetns

	this._loop = null;

	this._cues = [];

	this._init();

};


Object.defineProperty(Hypervideo.prototype, "src", {
	get: function(){
		return this._src;
	},
	set: function(src){
		this._src = src;
		this.ele.src = src;
	}
});


Hypervideo.prototype._init = function(){

	var container = document.createElement('div');
	document.body.appendChild(container);

	var video = document.createElement("video");
	video.src = this._src;
	container.appendChild(video);

	this._vid = video;
	this._ele = container;
	var self = this;
	this._loop = setInterval(function(){self._looper(self)}, 1000/30);

};

Hypervideo.prototype._looper = function(self){
	for (var i = 0; i < self._cues.length; i++) {
		if( self._vid.currentTime >= self._cues[i].time && !self._cues[i].ran){
			self._cues[i].ran = true;
			self._cues[i].callback();
		}
	}

};

Hypervideo.prototype.cue = function(time, callback){
	var obj = {};
	obj.time = time;
	obj.callback = callback; // add error checking
	obj.ran = false;

	this._cues.push(obj);
};

Hypervideo.prototype.play = function(){ //Make sure to include any functionaly in the original "play" function
	this._vid.play();
};

Hypervideo.prototype.pause = function(){
	this._vid.pause();
};
