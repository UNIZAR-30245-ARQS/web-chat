// Adapted, with a few changes, from the examples 
// in <http://socket.io/get-started/chat/>,
// <https://www.cloudamqp.com/docs/nodejs.html>
// and <https://github.com/squaremo/amqp.node>
// **Very** quick-and-dirty example.

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var amqp = require('amqplib/callback_api');

// Used to send messages to the text parser
var QUEUE_NAME = "chat_messages";
// Used to receive messages from the text parser with the ids of the
// "bad clients"
var BANNED_QUEUE_NAME = "banned_users";

// To keep track of the clients
var clientSockets = new Array();

// Return the client (index.html) when a web browser points at the / path
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

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
		publish("", QUEUE_NAME, new Buffer(socket.id + ":" + msg));
	});
});

// Launch the web server on the port 3000
http.listen(3000, function(){
	console.log('listening on *:3000');
});


// If the connection is closed or fails to be established at all, we will reconnect
// There should be an environment variable named CLOUDAMQP_URL for this to work
// following this URI specification: https://www.rabbitmq.com/uri-spec.html
// (of course there must be an AMQP 0.9.1 broker where this URL points)
// If this environment variable does not exist, it will try to connect to a broker
// in localhost with default values
var amqpConn = null;
function startAMQP() {
	var brokerURL = process.env.CLOUDAMQP_URL ? process.env.CLOUDAMQP_URL : "amqp://localhost";
	amqp.connect(brokerURL + "?heartbeat=60", function(err, conn) {
		if (err) {
			console.error("[AMQP]", err.message);
			return setTimeout(start, 1000);
		}
		conn.on("error", function(err) {
			if (err.message !== "Connection closing") {
				console.error("[AMQP] conn error", err.message);
			}
		});
		conn.on("close", function() {
			console.error("[AMQP] reconnecting");
			return setTimeout(start, 1000);
		});
		console.log("[AMQP] connected");
		amqpConn = conn;
		whenConnected();
	});
}

// Once connected to the AMQP broker, we launch the publisher and subscriber to that broker
function whenConnected() {
	startPublisher();
	startSubscriber();
}


var pubChannel = null;
var offlinePubQueue = [];
// The publisher sends the chat messages to QUEUE_NAME in the AQMP broker
function startPublisher() {
	amqpConn.createConfirmChannel(function(err, ch) {
		if (closeOnErr(err)) return;
		ch.on("error", function(err) {
		  console.error("[AMQP] channel error", err.message);
		 });
		ch.on("close", function() {
			console.log("[AMQP] channel closed");
		});		
		ch.prefetch(5);
		ch.assertQueue(QUEUE_NAME, { durable: true }, function(err, _ok) {
			if (closeOnErr(err)) return;      
		});		
		pubChannel = ch;
		while (true) {
			var m = offlinePubQueue.shift();
			if (!m) break;
			publish(m[0], m[1], m[2]);
		}
	});
}

function publish(exchange, routingKey, content) {
	try {
		pubChannel.publish(exchange, routingKey, content, { persistent: true },
			 function(err, ok) {
				if (err) {
					console.error("[AMQP] publish", err);
					offlinePubQueue.push([exchange, routingKey, content]);
					pubChannel.connection.close();
				} else {
					console.log("[AMQP] enviado " + content);                            
				}
				});
	} catch (e) {
		console.error("[AMQP] publish", e.message);
		offlinePubQueue.push([exchange, routingKey, content]);
	}
}

// The subscriber is connected to BANNED_QUEUE_NAME in the AMQP broker and disconnects 
// the chat clients which id is found there
function startSubscriber() {
	amqpConn.createChannel(function(err, ch) {
		if (closeOnErr(err)) return;
		ch.on("error", function(err) {
			console.error("[AMQP] channel error", err.message);
		});
		
		ch.on("close", function() {
			console.log("[AMQP] channel closed");
		});
		
		ch.prefetch(5);
		
		ch.assertQueue(BANNED_QUEUE_NAME, { durable: true }, function(err, _ok) {
			if (closeOnErr(err)) return;
			ch.consume(BANNED_QUEUE_NAME, processMsg);
			console.log("[AMQP] Subscriber is started");
		});
		
		function processMsg(id) {         
			console.log("[AMQP] Disconnecting this client: " + id.content.toString());         
			clientSockets[id.content.toString()].emit('ban message','IMPROPER LANGUAGE');
			clientSockets[id.content.toString()].disconnect();         
			ch.ack(id);
		}
	});    
}

function closeOnErr(err) {
	if (!err) return false;
	console.error("[AMQP] error", err);
	amqpConn.close();
	return true;
}

// Launch the connection to the AMQP Broker
startAMQP();