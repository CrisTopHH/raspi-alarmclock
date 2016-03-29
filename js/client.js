// Connect to Socket
var socket = io.connect('http://192.168.1.58:8001', {
	'reconnect': true,
	'reconnection delay': 500,
	'max reconnection attempts': 10
	});
var red = 0;
var green = 0;
var alarm_time;
var active = 0;
var wd = new Array(0,0,0,0,0,0,0); // Sunday = 0, ... , Sa = 6

// *************************************
// Event Handling for Server Messages
// *************************************
// Pong-Event
socket.on('pong', function (data) {
	console.log("pong");
	$("#text").text("Pong received");
});

// Disconnect Event
socket.on('disconnect', function () {
	console.log("disconnected");
	$("#text").text("Connection to Server lost");
});

// Connect Event
socket.on('connect', function () {
	console.log("connected");
	$("#text").text("Connection to Server established");
	socket.emit('req_status', {});
});

// Time event: Update displayed time
socket.on('time', function (data) {
	console.log("Time received from Server");
	$("#hhmm").text(data.hours + ":"+ data.minutes +":"+ data.seconds );
	$("#date").text(data.date);
});

// Alarm-Time Event: Update Alarm time
socket.on('al_time', function (data) {
	console.log("Alarm-time received from Server");
	alarm_time = data.al_time;
	$("#alarm-time").val(alarm_time);
});

// Radio Event: Update Radio Status
socket.on('radio', function (data) {
	console.log("radio status received");
	var station = "";
	var r_stat = data.stdout;
	var vol_pos = r_stat.indexOf("volume: ");
	var vol = r_stat.substring(vol_pos + 8, vol_pos + 11);
	if (vol.charAt(2) === "%"){vol = vol.substring(0,2);};
	console.log(vol);
	$("#vol").val(vol);
	for (var k in data) {
		station += data[k];
	}
	$("#radio-status").text("Radio: " + station);
});

// Status Event: Display Server status
socket.on('status', function (data) {
	console.log("status received...");
	$("#text").text("Alarm: " + data.red +" Radio:  " + data.green + " Wecken: " + data.al_time + " wd: " + wd );
	if(data.red != red){
		red = data.red;
		set_red();
	};
	if(data.green != green){
		green = data.green;
		set_green();
	};
	if(data.al_time != alarm_time){
		alarm_time = data.al_time;
		$("#alarm-time").val(alarm_time);
	};
	wd = data.wd;	
	set_wd();
});

// *************************************
// Function-Definitions
// *************************************

// Set Alarm
function set_red () {		
		if (red ===1){
			$("#red").addClass("btn-danger");
			$("#red").removeClass("btn-default");
			$("#red").text("Wecker ist AN");
		} else {
			$("#red").removeClass("btn-danger");
			$("#red").addClass("btn-default");
			$("#red").text("Wecker ist AUS");
		};
};

// Set Radio
function set_green () {		
		if (green ===1){
			$("#green").addClass("btn-success");
			$("#green").removeClass("btn-default");
			$("#green").text("Radio ist AN");
		} else {
			$("#green").removeClass("btn-success");
			$("#green").addClass("btn-default");
			$("#green").text("Radio ist AUS");
		};
};

// Set Alarm-Days
function set_wd () {		
	var id = "#0";
	for ( var i = 0; i < 7; i++) {
		id = "#" + i;
		if (wd[i] === 1){
			$(id).addClass("btn-primary active");
		}else{
			$(id).removeClass("btn-primary active");
		};	
	};
};

// *************************************
// Event Handling for Document
// *************************************

$(document).ready(function() {
	$("#text").text("Document ready!");
		socket.emit('req_status', {});	
	
	$("#alarm-time").change(function() {
		var al_time = $("#alarm-time").val();
		socket.emit('alarm-time', {al_time});
		console.log("alarm changed to "+al_time);	
	});	

	$("#hello").click(function(){
		socket.emit('ping', { duration: 2});
		$("#text").text("Ping sent...");	
	});

	$("#red").click(function(){
		if (red === 0){red = 1}else{ red = 0};
		set_red();
		socket.emit('red', { red: red});
		$("#text").text("RED toggled...");
	});

	$("#green").click(function(){
		if (green === 0){green = 1}else{ green = 0};
		set_green();
		socket.emit('green', { green: green});
		$("#text").text("Green toggled...");
	});

	$("#skip-fwd").click(function(){
		socket.emit('skip', {dir: "fwd" });
		$("#text").text("Skipped to next title...");		
	});

	$("#skip-back").click(function(){
		socket.emit('skip', {dir: "bck" });
		$("#text").text("Skipped to previous title...");		
	});

	$("#more-vol").click(function(){
		socket.emit('vol', {dir: "+" });
		$("#text").text("louder");		
	});

	$("#less-vol").click(function(){
		socket.emit('vol', {dir: "-" });
		$("#text").text("less loud");		
	});

	$("#0").click(function(){
		if (wd[0] === 0){ wd[0] = 1}else{ wd[0] = 0};
		socket.emit('wd', {wd: wd });
		$("#text").text("Sunday toggled...");		
	});

	$("#1").click(function(){
		if (wd[1] === 0){ wd[1] = 1}else{ wd[1] = 0};
		socket.emit('wd', {wd: wd });
		$("#text").text("Monday toggled...");		
	});
	$("#2").click(function(){
		if (wd[2] === 0){ wd[2] = 1}else{ wd[2] = 0};
		socket.emit('wd', {wd: wd });
		$("#text").text("Tuesday toggled...");		
	});
	$("#3").click(function(){
		if (wd[3] === 0){ wd[3] = 1}else{ wd[3] = 0};
		socket.emit('wd', {wd: wd });
		$("#text").text("Wednesday toggled...");		
	});
	$("#4").click(function(){
		if (wd[4] === 0){ wd[4] = 1}else{ wd[4] = 0};
		socket.emit('wd', {wd: wd });
		$("#text").text("Thursday toggled...");		
	});
	$("#5").click(function(){
		if (wd[5] === 0){ wd[5] = 1}else{ wd[5] = 0};
		socket.emit('wd', {wd: wd });
		$("#text").text("Friday toggled...");		
	});
	$("#6").click(function(){
		if (wd[6] === 0){ wd[6] = 1}else{ wd[6] = 0};
		socket.emit('wd', {wd: wd });
		$("#text").text("Saturday toggled...");		
	});

}); // document ready function
