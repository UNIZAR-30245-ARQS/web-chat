var amqpbridge = require('./amqpbridge.js');
var consts = require('./consts.js');

// To keep track of the clients
var clientSockets = new Array();

function disconnectBadClient(id) {
	clientSockets[id].emit('ban message','IMPROPER LANGUAGE');
	clientSockets[id].disconnect();         
}

function startSocketIOChannel(http) {
	var io = require('socket.io')(http);
	io.on('connection', function(socket){
		clientSockets[socket.id] = socket;
		console.log('user ' + socket.id + ' connected');    
		socket.on('disconnect', function(){
			// You should remove socket.id from clientSockets here if you want to
			// use this example to build something (probably a bad idea :-P)
			console.log('user ' + socket.id + ' disconnected');
		});
		socket.on('chat message', function(msg){
			console.log('message: ' + msg);
			// Send message to every connected client
			io.emit('chat message', msg);
			// Send it to the messaging middleware (AMQP broker) too so the text parser can receive and process it.
			// We use the client id as a correlation id.
			// Separating them with ":" is not a robust encoding of id+msg, but it is very easy to parse on the other side.
			amqpbridge.publish("", consts.QUEUE_NAME, new Buffer(socket.id + ":" + msg));
		});
	});

	amqpbridge.setBadClientBehavior(disconnectBadClient);
	// Launch the connection to the AMQP Broker
	amqpbridge.startAMQP();
}

module.exports.startSocketIOChannel = startSocketIOChannel;