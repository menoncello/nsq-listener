const Promise = require('bluebird-tools');
const nsq = require('nsqjs');
const request = Promise.promisifyAll(require('request'));
const EventEmitter = require('events');

class Listener extends EventEmitter {
	constructor({ dataUrl, dataUrlPort, dataTcpPort, lookupUrl, lookupPort, topic, channel, messageTimeout,
		            autoCreate, protocol }) {
		super();
		this._topic = topic;
		this._channel = channel;
		this._topicUrl = `${protocol || 'http'}://${dataUrl}:${dataUrlPort}/topic/create?topic=${topic}`;
		this._channelUrl = `${protocol || 'http'}://${dataUrl}:${dataUrlPort}/channel/create?topic=${topic}&channel=${channel}`;
		this._lookupdHTTPAddresses = `${lookupUrl}:${lookupPort}`;
		this._nsqdTCPAddresses = `${dataUrl}:${dataTcpPort}`;
		this._messageTimeout = messageTimeout;
		this._autoCreate = autoCreate;
		this._topicCreated = false;
		this._channelCreated = false;
	}

	createTopic(callback) {
		if (callback) {
			request.postAsync(this._topicUrl)
				.then(() => callback())
				.catch(err => callback(err));
			return undefined;
		}
		return request.postAsync(this._topicUrl);
	}

	createChannel(callback) {
		if (callback) {
			request.postAsync(this._channelUrl)
				.then(() => callback())
				.catch(err => callback(err));

			return undefined;
		}
		return request.postAsync(this._channelUrl);
	}

	listen(callback) {
		const reader = new nsq.Reader(this._topic, this._channel, {
			lookupdHTTPAddresses: this._lookupdHTTPAddresses,
			nsqdTCPAddresses: this._nsqdTCPAddresses,
			messageTimeout: this._messageTimeout,
		});

		reader.on('nsqd_closed', (msg) => this.emit('closed', msg));
		reader.on('message', (message) => this.emit('message', message));
		reader.on('discard', (msg) => this.emit('discard', msg));

		if (!callback) {
			return Promise.when(() => !this._topicCreated && !this._autoCreate, () => this.createTopic())
				.when(() => !this._channelCreated && !this._autoCreate, () => this.createChannel())
				.then(() => new Promise((resolve, reject) => {
					reader.on('nsqd_connected', (url, port) => resolve(url, port));
					reader.on('error', err => reject(err));

					reader.connect();
				}));
		}

		reader.on('nsqd_connected', (url, port) => callback(null, url, port));
		reader.on('error', err => callback(err));

		reader.connect();
		return undefined;
	}
}

module.exports = Listener;
