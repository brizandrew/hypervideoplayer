var vid = new Hypervideo({
	path: "reel.mp4"
});

vid.cue(5, function(){alert("hello");});
vid.cue(10, function(){alert("it's me");});