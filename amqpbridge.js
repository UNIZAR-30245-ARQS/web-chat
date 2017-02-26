var amqp = require('amqplib/callback_api');
var consts = require('./consts.js');

// If the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;
function startAMQP() {	
	amqp.connect(consts.BROKER_URL + "?heartbeat=60", function(err, conn) {
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
var offlinePubQueue = []; // Used to keep messages that couldn't be delivered, so we can
// tray again later.
// The publisher sends the chat messages to the EXCHANGE_NAME exchange in the AQMP broker.
// These messages must be pushed to offlinePubQueue for this to work, something which
// is done in the publish(exchange, key, content...) function
function startPublisher() {
	amqpConn.createConfirmChannel(function(err, ch) {
		if (closeOnErr(err)) return;
		ch.on("error", function(err) {
		  console.error("[AMQP] channel error", err.message);
		 });
		ch.on("close", function() {
			console.log("[AMQP] channel closed");
		});		
		
		// A fanout exchange. Not durable (i.e. won't survive a broker restart)		
		ch.assertExchange(consts.EXCHANGE_NAME, 'fanout', {durable: false});
		
		ch.prefetch(5);
		
		// A non durable queue with a random name will do
		ch.assertQueue("", function(err, _ok) {
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
					console.log("[AMQP] published " + content);                            
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
		
		ch.assertQueue(consts.BANNED_QUEUE_NAME, { durable: true }, function(err, _ok) {
			if (closeOnErr(err)) return;
			ch.consume(consts.BANNED_QUEUE_NAME, processMsg);
			console.log("[AMQP] Subscriber is started");
		});
		
		function processMsg(id) {         
			console.log("[AMQP] Disconnecting this client: " + id.content.toString());     
			notifyBadClientId(id.content.toString());			
			ch.ack(id);
		}
	});    
}

function notifyBadClientId(id) {
	// Do nothing. This should be defined by users of this module through the
	// setBadClientBehaviour function
}

function closeOnErr(err) {
	if (!err) return false;
	console.error("[AMQP] error", err);
	amqpConn.close();
	return true;
}

// For users of this module to set up the behaviour when a bad client is found
function setBadClientBehavior(notifyCallback) {
	notifyBadClientId = notifyCallback;	
}

module.exports.startAMQP = startAMQP;
module.exports.publish = publish;
module.exports.setBadClientBehavior = setBadClientBehavior;
