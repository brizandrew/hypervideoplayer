var self

function Hypervideo( config ){

	this._errorCheck(config);

	self = this;

	this._config = config; // save the config file for future use
	this._src = config.path; //src of the video
	this._host = config.host; //host of the video (Self or YouTube)
	this._ele = null; // parent container ( probably a div )
	this._player = null; // hypervideo player element
	this._vid = null; // video element
	this._yTPlayer = null; // YouTube player object
	this._list = {}; // object containing list ul and array of objects contatining li
	this._cues = []; // array containing callback functions at given times.

	this._isPlaying = false; // boolean indicating if the video is playing

	if(config.aspectRatio == "4:3") // float containing videos aspect ratio
		this._aspectRatio = 4/3;
	else
		this._aspectRatio = 16/9;

	this._currentSecond = 0; // video time rounded to the nearest tenth
	this._timeChange = new Event('timeChange'); // custom event to fire when _currentSecond changes

	this._tooltip = {}; // div showing the function of the highlighted button
	this._shareBox = {}; // div that appears with sharing options
	this._timer = null; // div displaying the current time of the video
	this._controls = {}; // object containing buttons and progress bar
	this._loop = null; // interval loop to keep track of the current second

	this._init_stage_one( config );
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

Hypervideo.prototype._init_stage_one = function( config ){

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
	this._list.ele = document.createElement("div");
	this._list.ele.id = "list";
	this._list.ele.className = "listNonFull";
	var unorderedList = document.createElement("ul");
	this._list.listItems = [];
	this._list.ele.appendChild(unorderedList);
	for (var i = 0; i < config.list.length; i++) {
		this.addLI(config.list[i]);
	};
	container.appendChild(this._list.ele);

	//create video player container
	this._player = document.createElement("div");
	this._player.id = "hypervideoPlayer";
	this._player.className = "hypervideoPlayerNonFull";
	container.appendChild(this._player);

	//add the video
	var video = document.createElement("video");
	this._vid = video;
	this._vid.id = "hypervideo";
	this._player.appendChild(video);

	//add "clear:both" line for style
	var clearDiv = document.createElement("div");
	clearDiv.style.clear = "both";
	this._player.appendChild(clearDiv);

	//add the video source
	if(this._host == "Self"){
		video.src = this._src;
		this._init_stage_two(config)
	}
	else if(this._host == "YouTube"){
		this._initYouTube();
	}
};

//takes place after external video loads
Hypervideo.prototype._init_stage_two = function( config ){
	//add tooltip
	this._tooltip.text = "";
	this._tooltip.ele = document.createElement("div");
	this._tooltip.ele.id = "tooltip";

	//add share box
	this._shareBox.input = "";
	this._shareBox.ele = document.createElement("div");
	this._shareBox.ele.id = "shareBox";
	this._shareBox.ele.style.display = "none";
	var embedDiv = document.createElement("div");
	embedDiv.innerHTML = "&#60;embed&#62;"
	this._shareBox.ele.appendChild(embedDiv);
	this._shareBox.ele.appendChild(document.createElement("br"));
	var embedCodeDiv = document.createElement("input");
	embedCodeDiv.id = "embedCode";
	embedCodeDiv.innerHTML = this._shareBox.input;
	this._shareBox.ele.appendChild(embedCodeDiv);
	this._shareBox.ele.appendChild(document.createElement("br"));
	this._player.appendChild(this._shareBox.ele);

	//add the control bar
	this._controls.ele = document.createElement("div");
	this._controls.ele.id = "controls";
	this._player.appendChild(this._controls.ele);

	//add the buttons to the control bar
	this._initControls(this);

	//add the currentTime div
	this._timer = document.createElement("div");
	this._timer.id = "currentTime";
	this._timer.innerHTML = this._toDisplayTime(this._currentSecond) + " / " + this._toDisplayTime(this.duration());

	//add duration bar to the controls bar
	this._controls.scrubber = {};
	this._controls.scrubber.durationBar = document.createElement("div");
	this._controls.scrubber.durationBar.id = "durationBar";
	this._controls.scrubber.progressBar = document.createElement("div");
	this._controls.scrubber.progressBar.id = "progressBar";
	this._controls.scrubber.progressBar.className = "durationBarStatic";
	this._controls.scrubber.durationBar.appendChild(this._controls.scrubber.progressBar);
	this._controls.scrubber.isScrubbing = false; // boolean keeping track of the occurence of scrubbing

	//add elements to controls div
	this._controls.ele.appendChild(this._controls.playButton._ele)
	this._controls.ele.appendChild(this._controls.shareButton._ele)
	this._controls.ele.appendChild(this._controls.volumeButton._ele)
	this._controls.ele.appendChild(this._timer)
	this._controls.ele.appendChild(this._controls.fullscreenButton._ele)
	this._controls.ele.appendChild(this._controls.scrubber.durationBar);

	this._vid.onclick = function() {self._controls.playButton._toggle();};

	//begin looping to check for currentSecond changes
	this._loop = setInterval(function(){self._looper()}, 1000);

	this._vid.addEventListener('timeChange', function () { 
		for (var i = 0; i < self._cues.length; i++)
			if( self._currentSecond == self._cues[i].time )
				self._cues[i].callback();
	}, false);

	this._ele.addEventListener('mouseenter', function () { 
		self.toggleControls(true);
	}, false);

	this._ele.addEventListener('mouseleave', function () { 
		if(self._isPlaying)
			self.toggleControls(false);
	}, false);

	this._controls.scrubber.durationBar.addEventListener('mousemove', function(e){
		if(self._controls.scrubber.isScrubbing)
			self.currentTime( ((e.clientX - self._controls.scrubber.durationBar.getBoundingClientRect().left)/self._controls.scrubber.durationBar.clientWidth) * self.duration() ) 
	}, false);

	this._controls.scrubber.durationBar.addEventListener('click', function(e){
			self.currentTime( ((e.clientX - self._controls.scrubber.durationBar.getBoundingClientRect().left)/self._controls.scrubber.durationBar.clientWidth) * self.duration() ) 
	}, false);

	this._controls.scrubber.durationBar.addEventListener('mousedown', function(e){
			self._controls.scrubber.isScrubbing = true;
	}, false);

	this._controls.scrubber.durationBar.addEventListener('mouseup', function(e){
			self._controls.scrubber.isScrubbing = false;
	}, false);

	//on page load, adjust the size of the hypervideo element
	window.addEventListener('load', function(event){
  		self._resetSizes();
	});

	//on window resize, adjust the size of the hypervideo element
	window.addEventListener('resize', function(event){
  		self._resetSizes();
	});

	//temp code to be replaced
	this._shareBox.input = '<iframe id="vid" src="hypervideoPlayer.html" allowfullscreen scrollling="no" frameBorder="0"></iframe>';
	embedCodeDiv.value = this._shareBox.input;
}

Hypervideo.prototype._looper = function(){
	if(Math.floor(this.currentTime() * 10)/10 != this._currentSecond)
			{
				if(this._host == "Self")
					this._currentSecond = Math.floor(this._vid.currentTime * 10)/10;
				else if(this._host == "YouTube")
					this._currentSecond = Math.floor(this._yTPlayer.getCurrentTime());
				this._vid.dispatchEvent(this._timeChange);
			}
	this._timer.innerHTML = this._toDisplayTime(this._currentSecond) + " / " + this._toDisplayTime(this.duration());
	this._controls.scrubber.progressBar.style.width = (this.currentTime() * 100 / this.duration()) + '%';
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
	self._controls.playButton = _playButton

	var _shareButton = new Button(
		"share",
		"icons/share.png",
		"icons/share.png",
		"shareButton",
		false,
		function(){
			self.hideShareBox();
		},
		function(){
			self.displayShareBox();
		});
	self._controls.shareButton = _shareButton

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
	self._controls.volumeButton = _volumeButton

	var _fullscreenButton = new Button(
		"fullscreen",
		"icons/fullscreenOn.png",
		"icons/fullscreenOff.png",
		"fullscreenButton",
		false,
		function(){
			self.exitFullscreen();
		},
		function(){
			self.enterFullscreen();
		});
	self._controls.fullscreenButton = _fullscreenButton
}

/********
<YouTube Functions>
********/
Hypervideo.prototype._initYouTube = function() {
	var tag = document.createElement('script');
		tag.src = "https://www.youtube.com/iframe_api";
	document.body.appendChild(tag);
}

onYouTubeIframeAPIReady = function() {
	var width = window.innerWidth
		|| document.documentElement.clientWidth
		|| document.body.clientWidth;
	if(width > 530)
		var playerWidth = width * 86 / 100; //86%
	else
		var playerWidth = width; //100%
	var listWidth = width * 14 / 100; //14%
	var height = playerWidth / this._aspectRatio;

	self._yTPlayer = new YT.Player('hypervideo', {
  		height: height,
  		width: playerWidth,
  		videoId: self._src,
  		events: {
      		'onReady': onPlayerReady,
      		'onStateChange': onPlayerStateChange
      	},
  		playerVars: {
  			controls: 0
  		}
	});
	self._resetSizes();
}
onPlayerReady = function() {
	self._init_stage_two(self.config)
}
onPlayerStateChange = function(change){
	if(change.data == 1){
		self._isPlaying = true;
		self._controls.playButton.setButtonOn();
	}
	if(change.data == 2){
		self._isPlaying = false;
		self._controls.playButton.setButtonOff();
	}
	if(change.data == 3){
		self.checkHighlight();
	}
}
/********
</YouTube Functions>
********/

Hypervideo.prototype._resetSizes = function(){
	var width = document.documentElement.clientWidth
				|| document.body.clientWidth;
	if(width > 530)
		var playerWidth = width * 86 / 100; //86%
	else
		var playerWidth = width; //100%
	var listWidth = width * 14 / 100; //14%
	var height = playerWidth / this._aspectRatio;

	this._player.style.width = playerWidth;
	this._player.style.height = height;
	this._list.ele.style.width = listWidth;
	this._list.ele.style.height = height;
	if(this._host == "YouTube")
		this._yTPlayer.a.width = playerWidth
}

Hypervideo.prototype._errorCheck = function( config ){
	if(typeof config !== "object")
		throw new Error("Hypervideo: expecting a config object");

	if(typeof config.path !== "string")
		throw new Error("Hypervideo: path expecting a vido path");

	if(typeof config.list !== "object")
		throw new Error("Hypervideo: list expecting a string array");

	if(typeof config.aspectRatio != "undefined" && config.aspectRatio != "16:9" && config.aspectRatio != "4:3")
		throw new Error('Hypervideo: aspectRatio expecting a string value of either "16:9" or "4:3"');

	if(typeof config.host !== "undefined" && config.host != "YouTube" && config.host != "Self")
		throw new Error('Hypervideo: host expecting a string value of either "YouTube" or "Self"')

	return false; //there are no errors
}

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

Hypervideo.prototype.cue = function(time, callback){
	var obj = {};
	obj.time = time;
	obj.callback = callback; // add error checking
	this._cues.push(obj);
};

Hypervideo.prototype.addLI = function(item){
	var obj = {};
	obj.text = item[0];
	obj.time = item[1];
	var paragraph = document.createElement("p");
	paragraph.innerHTML = item[0];
	obj.ele = document.createElement("li");
	obj.ele.appendChild(paragraph);
	self.cue(obj.time, function(){
		self.highlightStory(obj.ele);
	})

	obj.ele.addEventListener('click', function () { 
		self.currentTime(item[1])
		self.highlightStory(this)
	}, false);

	this._list.listItems.push(obj);
	this._list.ele.firstChild.appendChild(obj.ele);
};

Hypervideo.prototype.highlightStory = function(li){
	for (var i = self._list.listItems.length - 1; i >= 0; i--) {
		self._list.listItems[i].ele.className = "";
	};
	li.className = "currentItem";
	self.scrollToItem(li)
}

Hypervideo.prototype.checkHighlight = function(){
	for (var i = self._list.listItems.length - 1; i >= 0; i--) {
		if(i == self._list.listItems.length - 1 && self.currentTime() > self._list.listItems[i].time)
			self.highlightStory(self._list.listItems[i].ele)
		else if(self.currentTime() > self._list.listItems[i].time && self.currentTime() < self._list.listItems[i+1].time)
			self.highlightStory(self._list.listItems[i].ele)
	};
}

Hypervideo.prototype.scrollToItem = function(li){
	var startValue = self._list.ele.scrollTop;
	var destination = li.offsetTop;
	var totalChange = destination - startValue;
	var duration = 150; 
	var curPos = 0;
	var scrollInterval = setInterval(function(){
		self._list.ele.scrollTop = easeInOutQuart(curPos, startValue, totalChange, duration);
		curPos += 1;
		if(curPos == duration)
			clearInterval(scrollInterval);
	}, 5);
}

Hypervideo.prototype.toggleControls = function(on){
	var startValue = on ? 0:1;
	var change = on ? 1:-1;
	var duration = 50; 
	var curPos = 0;
	if(on)
		self._controls.ele.style.display = "block"
	else
		setTimeout(function(){self._controls.ele.style.display = "none";},500)

	self._controls.ele.style.opacity = on ? 1:0;
}

Hypervideo.prototype.play = function(time){ //Make sure to include any functionality in the original "play" function
	if(typeof time == "number")
		this.currentTime(time);
	if(this._host == "Self")
		this._vid.play();
	else if(this._host == "YouTube")
		this._yTPlayer.playVideo();
	this._isPlaying = true;
};

Hypervideo.prototype.pause = function(time){
	if(typeof time == "number")
		this.currentTime(time);
	if(this._host == "Self")
		this._vid.pause();
	else if(this._host == "YouTube")
		this._yTPlayer.pauseVideo();
	this._isPlaying = false;
};

Hypervideo.prototype.currentTime = function(time){
	if(this._host == "Self"){
		if(typeof time == "number"){
			this._vid.currentTime = time;
		}
		return this._vid.currentTime;
	}
	else if(this._host == "YouTube"){
		if(typeof time == "number"){
			this._yTPlayer.seekTo(time);
		}
		return this._yTPlayer.getCurrentTime();
	}
};

Hypervideo.prototype.duration = function(){
	if(this._host == "Self")
		return this._vid.duration;
	else if(this._host == "YouTube")
		return this._yTPlayer.getDuration();
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

Hypervideo.prototype.displayShareBox = function(){
	this._shareBox.ele.style.display = "block";
}

Hypervideo.prototype.hideShareBox = function(){
	this._shareBox.ele.style.display = "none";
}

Hypervideo.prototype.volume = function(amount){
	if(typeof amount == "number")
		this._vid.volume = amount;
	return this._vid.volume;
};

Hypervideo.prototype.mute = function(){
	if(this._host == "Self")
		this._vid.volume = 0;
	else if(this._host == "YouTube")
		this._yTPlayer.mute();
};

Hypervideo.prototype.unmute = function(){
	if(this._host == "Self")
		this._vid.volume = 1;
	else if(this._host == "YouTube")
		this._yTPlayer.unMute();
};

Hypervideo.prototype.enterFullscreen = function(){
	if(this._ele.requestFullscreen) {
		this._ele.requestFullscreen();
	} else if(this._ele.mozRequestFullScreen) {
		this._ele.mozRequestFullScreen();
	} else if(this._ele.webkitRequestFullscreen) {
		this._ele.webkitRequestFullscreen();
	} else if(this._ele.msRequestFullscreen) {
		this._ele.msRequestFullscreen();
	}
}

Hypervideo.prototype.exitFullscreen = function(){
	if(document.exitFullscreen) {
   		document.exitFullscreen();
	} else if(document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	} else if(document.webkitExitFullscreen) {
		document.webkitExitFullscreen();
	}
}

function easeInOutQuart(t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2*t*t*t*t + b;
	t -= 2;
	return -c/2 * (t*t*t*t - 2) + b;
};

function linearTransition(t, b, c, d) {
	return c*t/d + b;
};
