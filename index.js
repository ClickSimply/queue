"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var really_small_events_1 = require("really-small-events");
function QueueTS(options) {
    return new QueueTSClass(options);
}
exports.QueueTS = QueueTS;
var QueueTSClass = /** @class */ (function () {
    function QueueTSClass(options) {
        options = options || {};
        this.concurrency = options.concurrency || Infinity;
        this.timeout = options.timeout || 0;
        this.autostart = options.autostart || false;
        this.results = options.results || [];
        this.pending = 0;
        this.session = 0;
        this.running = false;
        this.jobs = [];
        this.timers = {};
        this.events = new really_small_events_1.ReallySmallEvents();
    }
    QueueTSClass.prototype.slice = function (begin, end) {
        this.jobs = this.jobs.slice(begin, end);
        return this;
    };
    QueueTSClass.prototype.reverse = function () {
        this.jobs.reverse();
        return this;
    };
    QueueTSClass.prototype.done = function (err) {
        this.session++;
        this.running = false;
        this.events.trigger("end", err);
    };
    QueueTSClass.prototype.on = function (event, cb) {
        this.events.on(event, cb);
    };
    QueueTSClass.prototype.off = function (event, cb) {
        this.events.off(event, cb);
    };
    QueueTSClass.prototype.callOnErrorOrEnd = function (cb) {
        var _this = this;
        var onerror = function (err) {
            _this.end(err);
        };
        var onend = function (err) {
            _this.off('error', onerror);
            _this.off('end', onend);
            cb(err, _this.results);
        };
        this.on('error', onerror);
        this.on('end', onend);
    };
    QueueTSClass.prototype.start = function (cb) {
        var _this = this;
        if (cb) {
            this.callOnErrorOrEnd(cb);
        }
        var t = this;
        this.running = true;
        if (this.pending >= this.concurrency) {
            return;
        }
        if (this.jobs.length === 0) {
            if (this.pending === 0) {
                this.done();
            }
            return;
        }
        var job = this.jobs.shift();
        var once = true;
        var session = this.session;
        var timeoutId = null;
        var didTimeout = false;
        var resultIndex = null;
        function next(err, result) {
            if (once && t.session === session) {
                once = false;
                t.pending--;
                if (timeoutId !== null) {
                    delete t.timers[timeoutId];
                    clearTimeout(timeoutId);
                }
                if (err) {
                    t.events.trigger("error", err, job);
                }
                else if (didTimeout === false) {
                    if (resultIndex !== null) {
                        t.results[resultIndex] = Array.prototype.slice.call(arguments, 1);
                    }
                    t.events.trigger("success", result, job);
                }
                if (t.session === session) {
                    if (t.pending === 0 && t.jobs.length === 0) {
                        t.done();
                    }
                    else if (t.running) {
                        t.start();
                    }
                }
            }
        }
        if (this.timeout) {
            timeoutId = setTimeout(function () {
                didTimeout = true;
                if (_this.events.eventListeners["timeout"] && _this.events.eventListeners["timeout"].length) {
                    _this.events.trigger("timeout", next, job);
                }
                else {
                    next();
                }
            }, this.timeout);
            this.timers[timeoutId] = timeoutId;
        }
        if (this.results) {
            resultIndex = this.results.length;
            this.results[resultIndex] = null;
        }
        this.pending++;
        var promise = job(next);
        if (promise && promise.then && typeof promise.then === 'function') {
            promise.then(function (result) {
                next(null, result);
            }).catch(function (err) {
                next(err || true);
            });
        }
        if (this.running && this.jobs.length > 0) {
            this.start();
        }
    };
    QueueTSClass.prototype.stop = function () {
        this.running = false;
    };
    QueueTSClass.prototype.clearTimers = function () {
        for (var key in this.timers) {
            var timeoutId = this.timers[key];
            delete this.timers[key];
            clearTimeout(timeoutId);
        }
    };
    QueueTSClass.prototype.end = function (err) {
        this.clearTimers();
        this.jobs.length = 0;
        this.pending = 0;
        this.done(err);
    };
    return QueueTSClass;
}());
exports.QueueTSClass = QueueTSClass;
["pop", "shift", "indexOf", "lastIndexOf"].forEach(function (method) {
    QueueTSClass.prototype[method] = function () {
        return Array.prototype[method].apply(this.jobs, arguments);
    };
});
["push", "unshift", "splice"].forEach(function (method) {
    QueueTSClass.prototype[method] = function () {
        var methodResult = Array.prototype[method].apply(this.jobs, arguments);
        if (this.autostart) {
            this.start();
        }
        return methodResult;
    };
});
Object.defineProperty(QueueTSClass.prototype, 'length', {
    get: function () {
        return this.pending + this.jobs.length;
    }
});
