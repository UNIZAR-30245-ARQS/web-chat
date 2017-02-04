// Adapted, with a few changes, from the examples 
// in <http://socket.io/get-started/chat/>,
// <https://www.cloudamqp.com/docs/nodejs.html>
// and <https://github.com/squaremo/amqp.node>
// **Very** quick-and-dirty example.

var app = require('express')();
var http = require('http').Server(app);
var socketio_server = require('./socketio_server.js');

// Return the client (index.html) when a web browser points at the / path
app.get('/', function(req, res){
	res.sendFile(__dirname + '/chat_application.html');
});

// Launch the web server on the port 3000
http.listen(3000, function(){
	console.log('listening on *:3000');
});

socketio_server.startSocketIOChannel(http);