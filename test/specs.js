const Promise = require('bluebird-tools');
const chai = require('chai');
const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
const timers = require('timers');
const EventEmitter = require('events');

chai.use(sinonChai);

suite('NSQ Listener', function() {
	let nsqjsMock;
	let requestMock;
	let NsqListener;

	before(function() {
		// this.timeout(250);
		mockery.enable({
			warnOnReplace: false,
			warnOnUnregistered: false,
			useCleanCache: true,
		});
		nsqjsMock = {
			Reader: class extends EventEmitter {
				connect() {
					this.emit('nsqd_connected');
					return this;
				}
			},
		};
		requestMock = {
			post: sinon.stub().callsFake((x, cb) => cb()),
		};

		mockery.registerMock('request', requestMock);
		mockery.registerMock('nsqjs', nsqjsMock);
		// sinon.stub(request, 'post')
		// 	.yields(null, null, null);

		NsqListener = require('../lib/index');
	});

	after(() => {
		mockery.disable();
	});

	beforeEach(function () {
		// Overwrite the global timer functions (setTimeout, setInterval) with Sinon fakes
		this.clock = sinon.useFakeTimers();
		requestMock.post = sinon.stub().callsFake((x, cb) => cb());
	});
	afterEach(function () {
		// Restore the global timer functions to their native implementations
		this.clock.restore();
		// requestMock.post.restore();
	});

	suite('#constructor', () => {
		let listener;

		beforeEach(() => listener = new NsqListener({
			dataUrl: 'test.com',
			dataUrlPort: 4321,
			dataTcpPort: 1234,
			lookupUrl: 'test-lookup.com',
			lookupPort: 1111,
			messageTimeout: 1000,
			topic: 'topic-test',
			channel: 'channel-test',
			protocol: 'https',
			autoCreate: true
		}));

		test('must set _lookupdHTTPAddresses correctly', () => expect(listener._lookupdHTTPAddresses)
			.equal('test-lookup.com:1111'));
		test('must set _nsqdTCPAddresses correctly', () => expect(listener._nsqdTCPAddresses)
			.equal('test.com:1234'));
		test('must set _topic correctly', () => expect(listener._topic).equal('topic-test'));
		test('must set _channel correctly', () => expect(listener._channel).equal('channel-test'));
		test('must set _channelUrl correctly',
			() => expect(listener._topicUrl).equal('https://test.com:4321/topic/create?topic=topic-test'));
		test('must set _channelUrl correctly', () => expect(listener._channelUrl)
			.equal('https://test.com:4321/channel/create?topic=topic-test&channel=channel-test'));
		test('must set _autoCreate correctly', () => expect(listener._autoCreate).to.be.true);
		test('must set _topicCreated correctly', () => expect(listener._topicCreated).to.be.false);
		test('must set _channelCreated correctly', () => expect(listener._channelCreated).to.be.false);
	});

	suite('#createTopic', function() {
		test('calls the request.post once', (done) => {
			const listener = new NsqListener({});
			listener.createTopic()
				.then(() => {
					expect(requestMock.post.calledOnce).to.be.true;
					done();
				})
				.catch(err => done(err));
		});
		test('must return undefined when passing a callback', () => {
			const listener = new NsqListener({});
			const result = listener.createTopic(() => {});
			expect(result).to.be.undefined;
		});
		test('must return a promise when nothing as callback', () => {
			const listener = new NsqListener({});
			const result = listener.createTopic();
			expect(result.isBluebird).to.be.true;
		});
		test('calls callback once, without arguments when everything goes right', (done) => {
			const listener = new NsqListener({});
			const callback = sinon.stub();
			new Promise((resolve) => {
				callback.callsFake(resolve);
				listener.createTopic(callback);
			})
				.then((e) => {
					expect(e).to.be.undefined;
					expect(callback.calledOnce).to.be.true;
					done();
				})
				.catch(e => done(e));
		});
		test('calls callback once, with error argument when returns a error', done => {
			const listener = new NsqListener({});
			const callback = sinon.stub();
			requestMock.post.callsFake((url, cb) => cb('error'));
			new Promise((resolve) => {
				callback.callsFake(resolve);
				listener.createTopic(callback);
			})
				.then((e) => {
					expect(e).to.be.not.undefined;
					expect(callback.calledOnce).to.be.true;
					done();
				})
				.catch(e => done(e));
		});
		test('execute then method when everything goes right',  done => {
			const listener = new NsqListener({});
			listener.createTopic()
				.then(() => done())
				.catch(e => done(e));
		});
		test('execute catch when returns a error', done => {
			const listener = new NsqListener({});
			requestMock.post.callsFake((url, cb) => cb('error'));
			listener.createTopic()
				.then(() => done('should not pass here'))
				.catch(() => done());
		});
		test('must post in to the topic url once', done => {
			const listener = new NsqListener({});
			requestMock.post.callsFake((url, cb) => cb(new Error('error')));
			listener.createTopic()
				.then(() => done('must not pass'))
				.catch(() => {
					expect(requestMock.post.calledOnce).to.be.true;
					done();
				});
		});
	});

	suite('#createChannel', function() {
		test('calls the request.post once', (done) => {
			const listener = new NsqListener({});
			listener.createChannel()
				.then(() => {
					expect(requestMock.post.calledOnce).to.be.true;
					done();
				})
				.catch(err => done(err));
		});
		test('must return undefined when passing a callback', () => {
			const listener = new NsqListener({});
			const result = listener.createChannel(() => {});
			expect(result).to.be.undefined;
		});
		test('must return a promise when nothing as callback', () => {
			const listener = new NsqListener({});
			const result = listener.createChannel();
			expect(result.isBluebird).to.be.true;
		});
		test('calls callback once, without arguments when everything goes right', (done) => {
			const listener = new NsqListener({});
			const callback = sinon.stub();
			new Promise((resolve) => {
				callback.callsFake(resolve);
				listener.createChannel(callback);
			})
				.then((e) => {
					expect(e).to.be.undefined;
					expect(callback.calledOnce).to.be.true;
					done();
				})
				.catch(e => done(e));
		});
		test('calls callback once, with error argument when returns a error', done => {
			const listener = new NsqListener({});
			const callback = sinon.stub();
			requestMock.post.callsFake((url, cb) => cb('error'));
			new Promise((resolve) => {
				callback.callsFake(resolve);
				listener.createChannel(callback);
			})
				.then((e) => {
					expect(e).to.be.not.undefined;
					expect(callback.calledOnce).to.be.true;
					done();
				})
				.catch(e => done(e));
		});
		test('execute then method when everything goes right',  done => {
			const listener = new NsqListener({});
			listener.createChannel()
				.then(() => done())
				.catch(e => done(e));
		});
		test('execute catch when returns a error', done => {
			const listener = new NsqListener({});
			requestMock.post.callsFake((url, cb) => cb('error'));
			listener.createChannel()
				.then(() => done('should not pass here'))
				.catch(() => done());
		});
		test('must post in to the topic url once', done => {
			const listener = new NsqListener({});
			requestMock.post.callsFake((url, cb) => cb(new Error('error')));
			listener.createChannel()
				.then(() => done('must not pass'))
				.catch(() => {
					expect(requestMock.post.calledOnce).to.be.true;
					done();
				});
		});
	});

	suite('#listen', () => {
		let listener;
		test('calls the request.post once, if "_topicCreated" is set to true', done => {
			listener = new NsqListener({ autoCreate: true });

			listener.listen()
				.then(() => {
					expect(listener._topicCreated).to.be.true;
					done();
				})
				.catch(() => done());
		});
		test('calls the request.post once, if "_topicCreated" is set to true and called twice', done => {
			listener = new NsqListener({ autoCreate: true });

			listener.listen()
				.then(() => listener.listen())
				.then(() => {
					expect(listener._topicCreated).to.be.true;
					expect(requestMock.post.calledOnce).to.be.true;
					done();
				})
				.catch(() => done());
		});
		test('never calls the request.post, if "_topicCreated" is set to false', done => {
			listener = new NsqListener({});

			listener.listen()
				.then(() => {
					expect(listener._topicCreated).to.be.false;
					expect(requestMock.post.neverCalled).to.be.true;
					done();
				})
				.catch(() => done());
		});

		test('must return undefined when passing a callback', () => {
			listener = new NsqListener({});
			const result = listener.listen(() => {});
			expect(result).to.be.undefined;
		});
		test('must return a promise when nothing as callback', () => {
			listener = new NsqListener({});
			const result = listener.listen();
			expect(result.isBluebird).to.be.true;
		});
		test('calls callback once, without arguments when everything goes right', (done) => {
			listener = new NsqListener({});
			const callback = sinon.stub();
			new Promise((resolve) => {
				callback.callsFake(() => resolve());
				listener.listen(callback);
			})
				.then((e) => {
					expect(e).to.be.undefined;
					expect(callback.calledOnce).to.be.true;
					done();
				})
				.catch(e => done(e));
		});
		test('execute then method when everything goes right',  done => {
			listener = new NsqListener({});
			listener.listen()
				.then(() => done())
				.catch(e => done(e));
		});
		test('calls callback once, with error argument when returns a error', done => {
			const listener = new NsqListener({});
			const callback = sinon.stub();
			new Promise(resolve => {
				callback.callsFake(() => resolve());
				listener.listen(callback);
			})
				.then((e) => {
					expect(e).to.be.undefined;
					expect(callback.calledOnce).to.be.true;
					done();
				})
				.catch(e => done(e));
		});
	});

	suite('#events', () => {
		let listener;
	});
});
