// Required Libraries
var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	url = require('url'),
	fs = require('fs');
var sys = require('sys');
var exec = require('child_process').exec;

// Global Variables

var red_stat = 0; //Alarm on/off
var grn_stat = 0; // Radio on/off
var pressed = 0; // HW Button pressed/not pressed
var active = 1;  // Watching for alarm-conditions on/off
var al_days = new Array(0,0,0,0,0,0,0); // Sunday = 0, ... , Sa = 6

var alarm_time = "12:00"; // Initial Alarm time

// Start Socket on port 8001
app.listen(8001);

// GPIO Magic
// --------------------------
// Pin 17: button
// Pin 22: Red LED
// Pin 27: Green LED
// Pin 23: Audio Amp ( High = 1 = On, Low = 0 = Off)
var GPIO = require('onoff').Gpio;
var red = new GPIO(22, 'out');
var grn = new GPIO(27, 'out');
var amp = new GPIO (23, 'out');
var button = new GPIO(17, 'in', 'both', {persistentWatch: true, debounceTimeout: 50});

//Init LEDs to off
red.writeSync(red_stat);
grn.writeSync(grn_stat);
amp.writeSync(0);

//HTTP Handler Function
function handler (req, res) {
	// Parse requested URL
	var path = url.parse(req.url).pathname
	
	// Manage the root route	
	if (path == '/') {
		index = fs.readFile('index.html',
			function (error, data) {
				if (error) {
					res.writeHead(500);
					return res.end("Error: unable to load index.html");
				} // if 
				res.writeHead(200,{'Content-Type': 'text/html'});
				res.end(data);
			}); // function				

	// Manage the js route
    	} else if( /\.(js)$/.test(path) ) {
        	index = fs.readFile(__dirname+path, 
            		function(error,data) {

                	if (error) {
                    		res.writeHead(500);
                    		return res.end("Error: unable to load " + path);
                	}

                	res.writeHead(200,{'Content-Type': 'text/plain'});
                	res.end(data);
	}); // elseif
   

	// Manage the css route
    	} else if( /\.(css)$/.test(path) ) {
        	index = fs.readFile(__dirname+path, 
            		function(error,data) {

                	if (error) {
                    		res.writeHead(500);
                    		return res.end("Error: unable to load " + path);
                	}

                	res.writeHead(200,{'Content-Type': 'text/css'});
                	res.end(data);
	}); // elseif
    	} else {
        	res.writeHead(404);
        	res.end("Error: 404 - File not found.");
   	 } // if
} //HTTP handler

// Web Socket Connection
io.sockets.on ('connection', function (socket) {

	// Respond to ping
	socket.on('ping', function(data) {
		console.log("ping");
		delay = data ["duration"];
		// Set a timer for when we should stop watering
		setTimeout(function(){
			socket.emit("pong");
		}, delay*100);
	});

	// Set Radio
	socket.on('green', function(data) {
		 // turn RED on
		grn_stat = data.green;
		set_green();
	}); // green

	// SetVolume
	socket.on('vol', function(data) {
		set_volume(data.dir);
	}); // green

	// Skip Title
	socket.on('skip', function(data) {
		skip(data.dir);
	}); // green

	// Set Alarm
	socket.on('red', function(data) {
		 // turn Green on
		red_stat = data.red;
      		set_red();
	}); // red

	// Set Alarm-days
	socket.on('wd', function(data) {
		al_days = data.wd;
      		send_status_all();
		console.log(al_days);
	}); // red

	// Set Alarm-Time
	socket.on('alarm-time', function(data) {
		 // turn Green on
		alarm_time = data.al_time;
		send_status_all();
		console.log (alarm_time);		
	}); // alarm_time

	// Respond to Status Request
	socket.on('req_status', send_status ); 

	// Update Time once a second
	timewatch = setInterval( sendTime, 1000);

	// Watch the Hardware button
  	button.watch(function(err, state) {
		// Error Handling	
		if (err) {
			throw err;
		}  else { 	
			console.log('Button: ' + state);
    			// check the state of the button
    			// 1 == pressed, 0 == not pressed
    			if(state == 0 && pressed ==0) {
    				// toogle Radio
      				console.log("Button pressed");
				if (grn_stat === 0){
					grn_stat = 1
				}else{
					grn_stat = 0
				};
      				set_green();

				pressed = 1;   
    			}; // if pressed
			if (state == 1 && pressed == 1){
				pressed = 0;
				console.log("Button released");		
			}; // if released
		} //err 
  	}); //button watch

	// Get time, send time and check for alarm 
	function sendTime (){
		// get time
		var jetzt = new Date();

		// Format time		
		var tag =( (jetzt.getDate() < 10) ? "0" : "") + (jetzt.getDate());
		var monat = ((jetzt.getMonth() +1) < 10 ? "0" : "") +  (jetzt.getMonth() +1);
		var jahr = jetzt.getFullYear();
		var stunden = (  (jetzt.getHours() < 10) ? "0" : "") + (jetzt.getHours());
		var minuten = (  (jetzt.getMinutes() < 10) ? "0" : "") + (jetzt.getMinutes());
		var sekunden =  ((jetzt.getSeconds() < 10) ? "0" : "") + (jetzt.getSeconds());
		var wt = jetzt.getDay();		
		var wota = new Array("So","Mo","Di","Mi","Do","Fr","Sa");

		// Put formatted time in var datum
		var datum =  wota[wt] +", " + tag + "." + monat + "." + jahr; 
		
		// send time		
		socket.emit("time", {
			hours: jetzt.getHours(),
			minutes: minuten,
			seconds: sekunden,
			date: datum 		
		});

		// prüfen, ob Weckzeit erreicht ist
		var act_time = stunden + ":" + minuten;
		//console.log(act_time + " vs. " + alarm_time + " Al: " + red_stat+ " Act: " + active);
		var day_active = al_days[wt];
		if(alarm_time == act_time && red_stat ===1 && active ===1 && day_active ==1){
			if (grn_stat != 1){
				grn_stat = 1;				
				set_green();
				active =0;
			};
		}; //if alarm time
		
		// Rest Active if no alarm-time
		if(alarm_time != act_time){
			active =1;
		}//if no alarm time
};

// send status to ALL clients
function send_status_all(){
	io.sockets.emit("status", { 
		red: red_stat , 
		green: grn_stat,
		al_time: alarm_time,
		wd: al_days
	});
};

// send status to requesting client
function send_status(){
	socket.emit("status", { 
		red: red_stat , 
		green: grn_stat,
		al_time: alarm_time,
		wd: al_days
	});
};

// set red LED according to status and send status to all clients
function set_red(){
	red.writeSync(red_stat);
	send_status_all();
	console.log("Red LED set to " + red_stat);
};

function puts(error, stdout, stderr){
	sys.puts(stdout);
	io.sockets.emit("radio", {stdout});
};

// set green LED and radio according to status and send status to all clients
function set_green(){
	grn.writeSync(grn_stat);
	if(grn_stat === 1){
		exec("mpc play", puts);
		amp.writeSync(1);
	};
	if(grn_stat === 0){
		exec("mpc stop", puts);
		amp.writeSync(0);
	};
	send_status_all();
	console.log("Green LED set to " + grn_stat);
};

function set_volume(dir){
	if(dir === "+"){exec("mpc volume +1", puts);};
	if(dir === "-"){exec("mpc volume -1", puts);};
	if(dir >=1 && dir <= 100 ){exec("mpc volume "+dir, puts);};
	send_status_all();
	console.log("Volume adjusted");
};

function skip(dir){
	if(dir === "fwd"){exec("mpc next", puts);};
	if(dir === "bck"){exec("mpc prev", puts);};
	send_status_all();
	console.log("Skipped");
};

});  //io.sockets


