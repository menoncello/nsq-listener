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
			`${this.options.dataUrl}:${this.options.dataPort}/topic/create?topic=${this.options.topic}`,
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
		const reader = new nsq.Reader(this.options.channel, this.options.topic, {
			lookupdHTTPAddresses: `${this.options.lookupUrl}:${this.options.lookupPort}`,
			nsqdTCPAddresses: `${this.options.dataUrl}:${this.options.dataTcpPort}`,
			messageTimeout: this.options.messageTimeout,
		});

		reader.connect();

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
