// Adapted, with a few changes, from the examples 
// in <http://socket.io/get-started/chat/>,
// <https://www.cloudamqp.com/docs/nodejs.html>
// and <https://github.com/squaremo/amqp.node>
// **Very** quick-and-dirty example.

var app = require('express')();
var http = require('http').Server(app);
var socketio_server = require('./socketio_server.js');

// There should be an environment variable CHAT_HTTP_PORT (with a valid port number)
// In case there is not one, 3000 is used
var CHAT_HTTP_PORT = 3000;
if (process.env.CHAT_HTTP_PORT) {
	// This only checks that the variable can be parsed as an integer
	var envVar = parseInt(process.env.CHAT_HTTP_PORT, 10);
	if (!isNaN(envVar)) {
		CHAT_HTTP_PORT = envVar;
	}
}    

// Return the client (index.html) when a web browser points at the / path
app.get('/', function(req, res){
	res.sendFile(__dirname + '/chat_application.html');
});

// Launch the web server on the port CHAT_HTTP_PORT
http.listen(CHAT_HTTP_PORT, function(){
	console.log('listening on *:', CHAT_HTTP_PORT);
});

socketio_server.startSocketIOChannel(http);