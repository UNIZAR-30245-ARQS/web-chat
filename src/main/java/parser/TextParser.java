package parser;

import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.QueueingConsumer;

/** 
 * @author Rubén Béjar <http://www.rubenbejar.com>
 */
public class TextParser {

	private final static String QUEUE_NAME = "chat_messages";
	private final static String BANNED_QUEUE_NAME = "banned_users";
	private final static String ENV_AMQPURL_NAME = "CLOUDAMQP_URL";

	public static void main(String[] argv) throws Exception {
		// A  connetion to the RabbitMQ broker (it will try at the URL in
		// the environment variable ENV_AMQPURL_NAME, or else in localhost)		
		ConnectionFactory factory = new ConnectionFactory();
		String amqpURL = System.getenv().get(ENV_AMQPURL_NAME) != null ? System.getenv().get(ENV_AMQPURL_NAME) : "amqp://localhost";
		try {
			factory.setUri(amqpURL);
		} catch (Exception e) {
			System.out.println(" [*] AQMP broker not found in " + amqpURL);
			System.exit(-1);
		}
		Connection connection = factory.newConnection();
		// With a single channel
		Channel channel = connection.createChannel();		
		// We declare a queue in the broker named QUEUE_NAME
		// Durable (persists even between crashes of the broker) and non-exclusive (it
		// must be accessed from other connections too)
		channel.queueDeclare(QUEUE_NAME, true, false, false, null);
		// Another one for the "bans"
		channel.queueDeclare(BANNED_QUEUE_NAME, true, false, false, null);
		System.out.println(" [*] Waiting for messages. CTRL+C to exit");					
		
		// The consumer object keeps the messages that arrive to 
		// the QUEUE_NAME queue until we read them
		QueueingConsumer consumer = new QueueingConsumer(channel);
		// autoAck is true (ack is automatic as soon as the message is delivered to consumer)
		channel.basicConsume(QUEUE_NAME, true, consumer);

		while (true) {
			// Blocks until a message arrives
			QueueingConsumer.Delivery delivery = consumer.nextDelivery();
			String message = new String(delivery.getBody());
			System.out.println(" [x] Received '" + message + "'");
			int separator = message.indexOf(":");
			String clientId = message.substring(0, separator);
			String messageContents = message.substring(separator + 1, message.length());
			if (messageContents.toLowerCase().contains("fuck") ||
				messageContents.toLowerCase().contains("bastard") ||
				messageContents.toLowerCase().contains("shit")) {				
				// If a swear word is detected in the message, send a message to the
				// BANNED_QUEUE_NAME with the correlation id of the chat client that
				// said it. We do this through the default exchange.
				channel.basicPublish("", BANNED_QUEUE_NAME, null, clientId.getBytes());
				System.out.println(" [x] Sent '" + clientId + "'");
			}						
		}
	}
}