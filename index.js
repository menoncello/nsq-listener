const nsq = require('nsqjs');
const request = require('request');
const EventEmitter = require('events');

class Listener extends EventEmitter {
	constructor(options) {
		super();
		this.options = options;
		this.optionsErrors = [];
	}

	createTopic(callback) {
		if (!this.checkOptions()) {
			callback({
				msg: this.optionsErrors.join('\n'),
			});
			return;
		}

		request.post(
			`${this.options.dataUrl}:${this.options.dataUrlPort}/topic/create?topic=${this.options.topic}`,
			topicCreated);

		function topicCreated(err) {
			if (err) {
				console.error(err);
				callback(err);
				return;
			}

			callback();
		}
	}

	createChannel(callback) {
		if (!this.checkOptions()) {
			callback({
				msg: this.optionsErrors.join('\n'),
			});
			return;
		}

		request.post(
			`${this.options.dataUrl}:${this.options.dataUrlPort}/channel/create?topic=${this.options.topic}&` +
			`channel=${this.options.channel}`,
			channelCreated);

		function channelCreated(err) {
			if (err) {
				console.error(err);
				callback(err);
				return;
			}

			callback();
		}
	}

	listen() {
		const reader = new nsq.Reader(this.options.topic, this.options.channel, {
			lookupdHTTPAddresses: `${this.options.lookupUrl}:${this.options.lookupPort}`,
			nsqdTCPAddresses: `${this.options.dataUrl}:${this.options.dataTcpPort}`,
			messageTimeout: this.options.messageTimeout,
		});

		reader.connect();
		reader.on('message', function onMessage(message) {
			this.emit('message', message);
		});

		reader.on('nsqd_connected', function onConnected(url, port) {
			this.emit('nsqd_connected:', url, port);
		});

		reader.on('nsqd_closed', function onClosed(msg) {
			this.emit('nsqd_closed', msg);
		});

		reader.on('error', function onError(err) {
			this.emit('error', err);
		});

		reader.on('discard', function onDiscard(msg) {
			this.emit('discard', msg);
		});
	}

	checkOptions() {
		if (!this.options) {
			const err = 'options is a required parameter';
			if (this.optionsErrors.indexOf(err) === -1) {
				this.optionsErrors.push(err);
			}
			return false;
		}

		if (!this.options.dataUrl) {
			const err = 'Property of options "dataUrl" is a required';
			if (this.optionsErrors.indexOf(err) === -1) {
				this.optionsErrors.push(err);
			}
		}

		if (!this.options.dataPort) {
			const err = 'Property of options "dataPort" is a required';
			if (this.optionsErrors.indexOf(err) === -1) {
				this.optionsErrors.push(err);
			}
		}

		if (!this.options.topic) {
			const err = 'Property of options "topic" is a required';
			if (this.optionsErrors.indexOf(err) === -1) {
				this.optionsErrors.push(err);
			}
		}

		return this.optionsErrors.length === 0;
	}
}

module.exports = Listener;
