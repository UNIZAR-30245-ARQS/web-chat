var amqpbridge = require('./amqpbridge.js');
var consts = require('./consts.js');

function startSocketIOChannel(http) {
	var io = require('socket.io')(http);
	io.on('connection', function(socket){		
		console.log('user ' + socket.id + ' connected');    		
		socket.on('chat message', function(msg){
			console.log('message: ' + msg);
			// Send message to every connected client
			io.emit('chat message', msg);
			// Send it to the messaging middleware (AMQP broker) too so the text parser can receive and process it.
			// We use the client id as a correlation id.
			// Separating them with ":" is not a robust encoding of id+msg, but it is very easy to parse on the other side.
			amqpbridge.publish(consts.EXCHANGE_NAME, "", new Buffer(socket.id + ":" + msg));
		});
	});
	
	function disconnectBadClient(id) {		
		io.emit('ban message',id+':IMPROPER LANGUAGE');		
	}
	
	amqpbridge.setBadClientBehavior(disconnectBadClient);
	// Launch the connection to the AMQP Broker
	amqpbridge.startAMQP();
}

module.exports.startSocketIOChannel = startSocketIOChannel;