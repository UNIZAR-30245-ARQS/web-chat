# Web chat
A quick-and-dirty web chat example using socket.io and RabbitMQ. This illustrates the publish-subscribe architectural style with asynchronous messaging in a fully distributed system with two different programming languages.

The system allows N users to chat using their web browsers, but those who use certain swear words are disconnected. 

# Requirements
You need to have installed a Java Virtual Machine, [Node.js](https://nodejs.org/en/) and npm (may come with your Node.js installation).

I have only tested this with OpenJDK 1.8, Node.js 4.2.6 and npm 3.5.2 on Ubuntu 16.04, but it will work with other versions of these tools and in most operating systems.

You also need access to an AMQP 0.9.1 broker (but I have only tested this with RabbitMQ). You have many options to install RabbitMQ (on your machine, a Docker image, on different cloud providers etc.) described in <https://www.rabbitmq.com/download.html>. I have tested this with a default local installation on Ubuntu 16.04 (the version in the default repositories), and also with the instance included in the free plan by [CloudAMQP](https://www.cloudamqp.com/), which is probably the simplest way to try this.

# Install
Clone this repository: `$ git clone https://github.com/UNIZAR-30245-ARQS/web-chat.git`
On that directory, download the NodeJS dependencies for the client and the server: `$ npm install`

# Run
First of all, you need to set up an environment variable named `CLOUDAMQP_URL` with the URL of your RabbitMQ broker. If you don't set one, it will try to connect to a broker in `amqp://localhost`. If you are using an instance provided by CloudAQMP, your URL may be something like `amqp://USER:PASSWORD@spotted-monkey.rmq.cloudamqp.com/USER`.

Then, you need to set up another environment variable named `CHAT_HTTP_PORT` with the port for the http server. If this variable is not found, the port 3000 is used by default.

To run the chat server, open a terminal and `$ nodejs server.js` or `$ node server.js` depending on your version. 

To run the chat clients, open a web browser and point it to the machine where the chat server is running, at port 3000. For example, if the web browser and the server are on the same machine, the URL will be <http://localhost:3000>. You can open as many tabs/windows as you want.

At that point you can start to chat, but the text parser which is looking for swear words is not yet running.

To run the text parser open another terminal and `$ ./gradlew run`. Again make sure that the environment variable exists, and that it points to the same AMQP broker that the chat server uses.

Now you can test the whole system. You can chat normally, but if you use one of the swear words that the text parser recognizes (e.g. "shit") you will be disconnected from the chat.

The system can be fully distributed. You can run the chat server, the chat clients, the AMQP broker and the text parser all in different machines. 

# Improvements
Besides improving the code, which is neither robust nor pretty, there are a few things that you can try to improve the functionality of the system. Some examples:

- You can add other text parsers, which look for other words and run on their own machines. You will need to think about the type of exchange that you need to use in RabbitMQ for all the messages in a queue to reach several different parsers. Some of these parsers can be written in a third programming language, using the proper RabbitMQ libraries.
- You could prevent swear words from reaching the other users of the chat. You will need to the design the system so the text parser must send an explicit "OK" for every message before it can be sent to the other chat users.
- If you are a front-end person, make the GUI responsive. Currently it works fine on mobile browsers (barely tested on my own device Android/Firefox), but the GUI is difficult to use in small screens.

# Credits
The code is based on the examples in <http://socket.io/get-started/chat/>, <https://www.cloudamqp.com/docs/nodejs.html>, <https://github.com/squaremo/amqp.node> and <https://www.rabbitmq.com/tutorials/tutorial-one-java.html>.
