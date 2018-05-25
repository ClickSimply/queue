import { ReallySmallEvents } from "really-small-events";

export interface QueueOptions {
	concurrency?: number;
	timeout?: number;
	autostart?: boolean;
	results?: any[];
}

export function QueueTS(options?: QueueOptions) {
	return new QueueTSClass(options);
}

export class QueueTSClass {

	public concurrency: number;
	public timeout: number;
	public autostart: boolean;
	public results: any[];
	public pending: number;
	public session: number;
	public running: boolean;
	public jobs: any[];
	public timers: any;
	public events: ReallySmallEvents;

	constructor(options?: QueueOptions) {
		options = options || {};
		this.concurrency = options.concurrency || Infinity;
		this.timeout = options.timeout || 0;
		this.autostart = options.autostart || false;
		this.results = options.results || [];
		this.pending = 0
		this.session = 0
		this.running = false
		this.jobs = []
		this.timers = {}
		this.events = new ReallySmallEvents();
	}

	slice(begin: number, end?: number): this {
		this.jobs = this.jobs.slice(begin, end);
		return this
	}

	reverse(): this {
		this.jobs.reverse()
		return this
	}

	done(err?: any) {
		this.session++
		this.running = false
		this.events.trigger("end", err);
	}

	on(event: string, cb: any) {
		this.events.on(event, cb);
	}

	off(event: string, cb: any) {
		this.events.off(event, cb);
	}

	callOnErrorOrEnd(cb) {

		const onerror = (err) => { 
			this.end(err);
		};

		const onend = (err) => {
			this.off('error', onerror);
			this.off('end', onend);
			cb(err, this.results);
		};

		this.on('error', onerror);
		this.on('end', onend);
	}

	start(cb?: any) {
		if (cb) {
			this.callOnErrorOrEnd(cb);
		}
		const t = this;

		this.running = true

		if (this.pending >= this.concurrency) {
			return
		}

		if (this.jobs.length === 0) {
			if (this.pending === 0) {
				this.done();
			}
			return
		}

		let job = this.jobs.shift()
		let once = true
		let session = this.session
		let timeoutId = null
		let didTimeout = false
		let resultIndex = null

		function next(err?: any, result?: any) {
			if (once && t.session === session) {
				once = false
				t.pending--
				if (timeoutId !== null) {
					delete t.timers[timeoutId]
					clearTimeout(timeoutId)
				}

				if (err) {
					t.events.trigger("error", err, job);
				} else if (didTimeout === false) {
					if (resultIndex !== null) {
						t.results[resultIndex] = Array.prototype.slice.call(arguments, 1);
					}
					t.events.trigger("success", result, job);
				}

				if (t.session === session) {
					if (t.pending === 0 && t.jobs.length === 0) {
						t.done();
					} else if (t.running) {
						t.start()
					}
				}
			}
		}

		if (this.timeout) {
			timeoutId = setTimeout(() => {
				didTimeout = true
				if (this.events.eventListeners["timeout"] && this.events.eventListeners["timeout"].length) {
					this.events.trigger("timeout", next, job);
				} else {
					next();
				}
			}, this.timeout)
			this.timers[timeoutId] = timeoutId
		}

		if (this.results) {
			resultIndex = this.results.length
			this.results[resultIndex] = null
		}

		this.pending++
		const promise = job(next);
		if (promise && promise.then && typeof promise.then === 'function') {
			promise.then((result) => {
				next(null, result)
			}).catch((err) => {
				next(err || true)
			})
		}

		if (this.running && this.jobs.length > 0) {
			this.start();
		}
	}

	stop() {
		this.running = false
	}

	clearTimers() {
		for (var key in this.timers) {
			var timeoutId = this.timers[key]
			delete this.timers[key]
			clearTimeout(timeoutId)
		}
	}

	end(err) {
		this.clearTimers();
		this.jobs.length = 0;
		this.pending = 0;
		this.done(err);
	}
}

["pop", "shift", "indexOf", "lastIndexOf"].forEach((method) => {
	QueueTSClass.prototype[method] = function () {
		return Array.prototype[method].apply(this.jobs, arguments);
	}
});

["push", "unshift", "splice"].forEach((method) => {
	QueueTSClass.prototype[method] = function () {
		var methodResult = Array.prototype[method].apply(this.jobs, arguments)
		if (this.autostart) {
			this.start()
		}
		return methodResult
	}
});

Object.defineProperty(QueueTSClass.prototype, 'length', {
	get: function () {
		return this.pending + this.jobs.length;
	}
});
