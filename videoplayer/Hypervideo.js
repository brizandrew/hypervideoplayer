function Hypervideo( config ){

	if(typeof config !== "object")
		throw new Error("Hypervideo: expecting a config object");

	if(typeof config.path !== "string")
		throw new Error("Hypervideo: path expecting a vido path");

	if(typeof config.list !== "object")
		throw new Error("Hypervideo: list expecting a string array");

	this._src = config.path; 
	
	this._ele = null; // parent container ( probably a div )
	this._vid = null; // video element

	this._list = {}; // object containing list ul and array of objects contatining li

	this._currentSecond = 0; // video time rounded to the nearest tenth
	this._timeChange = new Event('timeChange'); // custom event to fire when _currentSecond changes

	this._tooltip = {}; // div showing the function of the highlighted button

	this._shareBox = {}; // div that appears with sharing options

	this._timer = null; // div displaying the current time of the video

	this._controls = []; // array of buttons

	this._loop = null;

	this._cues = [];

	this._init( config );

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


Hypervideo.prototype._init = function( config ){

	var self = this;

	//create overall container
	var container = document.createElement("div");
	document.body.appendChild(container);
	container.id = "hyperVideoContent";
	this._ele = container;

	//add "clear:both" line for style
	var clearDiv = document.createElement("div");
	clearDiv.style.clear = "both";
	container.appendChild(clearDiv);

	//fill container with the list items
	var listContainerDiv = document.createElement("div");
	listContainerDiv.id = "list";
	listContainerDiv.className = "listNonFull";
	this._list.ele = document.createElement("ul");
	this._list.listItems = [];
	for (var i = 0; i < config.list.length; i++) {
		this.addLI(config.list[i]);
	};
	listContainerDiv.appendChild(this._list.ele);
	container.appendChild(listContainerDiv);

	//create video player container
	var hypervideoPlayerDiv = document.createElement("div");
	hypervideoPlayerDiv.id = "hypervideoPlayer";
	container.appendChild(hypervideoPlayerDiv);

	//add the video
	var video = document.createElement("video");
	video.src = this._src;
	this._vid = video;
	this._vid.id = "hypervideo";
	hypervideoPlayerDiv.appendChild(video);

	//add "clear:both" line for style
	var clearDiv = document.createElement("div");
	clearDiv.style.clear = "both";
	hypervideoPlayerDiv.appendChild(clearDiv);

	//add tooltip
	this._tooltip.text = "";
	this._tooltip.ele = document.createElement("div");
	this._tooltip.ele.id = "tooltip";

	//add share box
	this._shareBox.input = "";
	this._shareBox.ele = document.createElement("div");
	this._shareBox.ele.id = "shareBox";
	this._shareBox.ele.className = "shareBoxHidden";
	var embedDiv = document.createElement("div");
	embedDiv.innerHTML = "&#60;embed&#62;"
	this._shareBox.ele.appendChild(embedDiv);
	var downloadButtonDiv = document.createElement("div");
	downloadButtonDiv.id = "downloadButton";
	downloadButtonDiv.innerHTML = "download";
	this._shareBox.ele.appendChild(downloadButtonDiv);
	this._shareBox.ele.appendChild(document.createElement("br"));
	var embedCodeDiv = document.createElement("input");
	embedCodeDiv.id = "embedCode";
	embedCodeDiv.innerHTML = this._shareBox.input;
	this._shareBox.ele.appendChild(embedCodeDiv);
	this._shareBox.ele.appendChild(document.createElement("br"));
	hypervideoPlayerDiv.appendChild(this._shareBox.ele);

	//add the control bar
	var controlDiv = document.createElement("div");
	controlDiv.id = "controls";
	hypervideoPlayerDiv.appendChild(controlDiv);

	//add duration bar
	var durationBarDiv = document.createElement("div");
	durationBarDiv.id = "durationBar";
	var progressBarDiv = document.createElement("div");
	progressBarDiv.id = "progressBar";
	progressBarDiv.className = "durationBarStatic";
	var remainderBarDiv = document.createElement("div");
	remainderBarDiv.id = "remainderBar";
	remainderBarDiv.className = "durationBarStatic";
	durationBarDiv.appendChild(progressBarDiv);
	durationBarDiv.appendChild(remainderBarDiv);
	controlDiv.appendChild(durationBarDiv);

	//add the buttons to the control bar
	this._initControls(this);
	for (var i = 0; i < this._controls.length; i++) {
		controlDiv.appendChild(this._controls[i]._ele);
	};

	this._vid.onclick = function() {self._controls[0]._toggle();};

	//add the currentTime div
	this._timer = document.createElement("div");
	this._timer.id = "currentTime";
	this._timer.innerHTML = this._toDisplayTime(this._currentSecond) + " / " + this._toDisplayTime(this.duration());
	controlDiv.insertBefore(this._timer, this._controls[2]._ele);

	//begin looping to check for currentSecond changes
	this._loop = setInterval(function(){self._looper()}, 1000/30);

	this._vid.addEventListener('timeChange', function () { 
		for (var i = 0; i < self._cues.length; i++)
			if( self._currentSecond == self._cues[i].time )
				self._cues[i].callback();

	}, false);

};

Hypervideo.prototype._looper = function(){
	if(Math.floor(this._vid.currentTime * 10)/10 != this._currentSecond)
			{
				this._currentSecond = Math.floor(this._vid.currentTime * 10)/10;
				this._vid.dispatchEvent(this._timeChange);
			}
	this._timer.innerHTML = this._toDisplayTime(this._currentSecond) + " / " + this._toDisplayTime(this.duration());
};

Hypervideo.prototype._initControls = function(self){
	var _playButton = new Button(
		"play",
		"icons/playOn.png",
		"icons/playOff.png",
		"playButton",
		false,
		function(){
			self.pause();
		},
		function(){
			self.play();
		});
	self._controls.push(_playButton);

	var _shareButton = new Button(
		"share",
		"icons/share.png",
		"icons/share.png",
		"shareButton",
		false,
		function(){
			
		},
		function(){
			
		});
	self._controls.push(_shareButton);

	var _volumeButton = new Button(
		"volume",
		"icons/volumeOn.png",
		"icons/volumeOff.png",
		"volumeButton",
		true,
		function(){
			self.mute();
		},
		function(){
			self.unmute();
		});
	self._controls.push(_volumeButton);	

	var _fullscreenButton = new Button(
		"fullscreen",
		"icons/fullscreenOn.png",
		"icons/fullscreenOff.png",
		"fullscreenButton",
		false,
		function(){
			
		},
		function(){
			
		});
	self._controls.push(_fullscreenButton);

}

Hypervideo.prototype.cue = function(time, callback){
	var obj = {};
	obj.time = time;
	obj.callback = callback; // add error checking
	this._cues.push(obj);
};

Hypervideo.prototype.addLI = function(text){
	var obj = {};
	obj.text = text;
	var paragraph = document.createElement("p");
	paragraph.innerHTML = text;
	obj.ele = document.createElement("li");
	obj.ele.appendChild(paragraph);

	this._list.listItems.push(obj);
	this._list.ele.appendChild(obj.ele);
};

Hypervideo.prototype.play = function(time){ //Make sure to include any functionaly in the original "play" function
	if(typeof time == "number")
		this.currentTime(time);
	this._vid.play();
	this._isPlaying = true;
};

Hypervideo.prototype.pause = function(time){
	if(typeof time == "number")
		this.currentTime(time);
	this._vid.pause();
	this._isPlaying = false;
};

Hypervideo.prototype.currentTime = function(time){
	if(typeof time == "number")
		this._vid.currentTime = time;
	return this._vid.currentTime;
};

Hypervideo.prototype.duration = function(){
	return this._vid.duration;
};

Hypervideo.prototype.paused = function(){
	return this._vid.paused;
};

Hypervideo.prototype.readyState = function(){
	return this._vid.readyState;
};

Hypervideo.prototype.seeking = function(){
	return this._vid.seeking;
};

Hypervideo.prototype.volume = function(amount){
	if(typeof amount == "number")
		this._vid.volume = amount;
	return this._vid.volume;
};

Hypervideo.prototype.mute = function(){
	this._vid.volume = 0;
};

Hypervideo.prototype.unmute = function(){
	this._vid.volume = 1;
};

// convert seconds to a displayable format used in the toolbar
Hypervideo.prototype._toDisplayTime = function(input){
    var sec_num = parseInt(input, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);
    var hasHours = true;

    if(hours == 0){
    	hours = "";
    	hasHours = false;
    } 

    if(minutes == 0){
    	minutes = "0";
    }
    else if(minutes < 10 && hasHours){
    	minutes = "0"+minutes;
    }

    if(seconds < 10){
    	seconds = "0"+seconds;
    }

    if(hasHours)
    	var time = hours+':'+minutes+':'+seconds;
    else
    	var time = minutes+':'+seconds;

    return time;
}
