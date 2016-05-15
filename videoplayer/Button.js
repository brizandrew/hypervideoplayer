function Button( name, onImg, offImg, id, defaultState, callbackOn, callbackOff) {
	this.name = name;
	this._onImg = onImg;
	this._offImg = offImg;
	this._id = id;
	this._callbackOn = callbackOn;
	this._callbackOff = callbackOff;
	this._ele = null;
	this._toggled = defaultState;

	this._init();
}

Button.prototype._init = function(){
	var button = document.createElement('img');
	if( this._toggled )
		button.src = this._onImg;
	else
		button.src = this._offImg;
	button.id = this._id;

	this._ele = button;
	var self = this;
	this._ele.onclick = function(){ self._toggle() };
}

Button.prototype._toggle = function(){
	this._toggled = !this._toggled;
	if( this._toggled ){
		this._callbackOff();
		this._ele.src = this._onImg;
	}
	else{
		this._callbackOn();
		this._ele.src = this._offImg;
	}
}

Button.prototype.setButtonOn = function(){
	this._ele.src = this._onImg;
	this._toggled = true;
}

Button.prototype.setButtonOff = function(){
	this._ele.src = this._offImg;
	this._toggled = false;
}

