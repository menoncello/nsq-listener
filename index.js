const Promise = require('bluebird');
const nsq = require('nsqjs');
const request = Promise.promisifyAll(require('request'));
const EventEmitter = require('events');

class Listener extends EventEmitter {
	constructor({ dataUrl, dataUrlPort, dataTcpPort, lookupUrl, lookupPort, topic, channel, messageTimeout }) {
		super();
		this.options = {
			topic,
			channel,
			topicUrl: `http://${dataUrl}:${dataUrlPort}/topic/create?topic=${topic}`,
			channelUrl: `http://${dataUrl}:${dataUrlPort}/channel/create?topic=${topic}&channel=${channel}`,
			lookupdHTTPAddresses: `${lookupUrl}:${lookupPort}`,
			nsqdTCPAddresses: `${dataUrl}:${dataTcpPort}`,
			messageTimeout,
		};
	}

	createTopic(callback) {
		return callback
			? request.postAsync(this.options.topicUrl)
				.then(() => callback())
				.catch(err => callback(err))
			: request.postAsync(this.options.topicUrl);
	}

	createChannel(callback) {
		return callback
			? request.postAsync(this.options.channelUrl)
				.then(() => callback())
				.catch(err => callback(err))
			: request.postAsync(this.options.channelUrl);
	}

	listen() {
		const reader = new nsq.Reader(this.options.topic, this.options.channel, {
			lookupdHTTPAddresses: this.options.lookupdHTTPAddresses,
			nsqdTCPAddresses: this.options.nsqdTCPAddresses,
			messageTimeout: this.options.messageTimeout,
		});

		reader.connect();

		reader.on('message', function onMessage(message) {
			this.emit('message', message);
		});

		reader.on('nsqd_connected', function onConnected(url, port) {
			this.emit('connected:', url, port);
		});

		reader.on('nsqd_closed', function onClosed(msg) {
			this.emit('closed', msg);
		});

		reader.on('error', function onError(err) {
			this.emit('error', err);
		});

		reader.on('discard', function onDiscard(msg) {
			this.emit('discard', msg);
		});
	}
}

module.exports = Listener;
