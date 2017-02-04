// Used to send messages to the text parser
module.exports.QUEUE_NAME = "chat_messages";
// Used to receive messages from the text parser with the ids of the
// "bad clients"
module.exports.BANNED_QUEUE_NAME = "banned_users";
// There should be an environment variable named CLOUDAMQP_URL
// following this URI specification: https://www.rabbitmq.com/uri-spec.html
// (of course there must be an AMQP 0.9.1 broker where this URL points)
// If this environment variable does not exist, it will try to connect to a broker
// in localhost with default values
module.exports.BROKER_URL = process.env.CLOUDAMQP_URL ? process.env.CLOUDAMQP_URL : "amqp://localhost";
