"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

var _getPrototypeOf = require("babel-runtime/core-js/object/get-prototype-of");

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _possibleConstructorReturn2 = require("babel-runtime/helpers/possibleConstructorReturn");

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require("babel-runtime/helpers/inherits");

var _inherits3 = _interopRequireDefault(_inherits2);

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

var _events = require("events");

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//拼合两个函数
function createLineInOut(inf, out) {
    return function (v) {
        if (v < 0.5) return inf(v * 2) / 2;
        return out((v - 0.5) * 2) / 2 + 0.5;
    };
}
//反向函数
function createLineIn(out) {
    return function (v) {
        return 1 - out(1 - v);
    };
}
function createEase(outFunction) {
    var inFunction = createLineIn(outFunction);
    return {
        easeOut: outFunction,
        easeIn: inFunction,
        easeInOut: createLineInOut(inFunction, outFunction),
        easeOutIn: createLineInOut(outFunction, inFunction)
    };
}

//各种取值方式
function property_set(obj, key) {
    return function (val) {
        if (arguments.length) obj[key] = val;else return obj[key];
    };
}

function method_set(obj, key) {
    return function (val) {
        if (!arguments.length) return obj[key]();
        obj[key](val);
    };
}

function setter_set(obj, key) {
    var subKey = key.substr(3);
    var set_key = "set" + subKey;
    var get_key = "get" + subKey;
    return function (val) {
        if (arguments.length) obj[set_key](val);else return obj[get_key]();
    };
}
function requireTimeout(callback) {
    return setTimeout(callback, 16);
}

var obj_id = 0;

function _valueAtUnit(oi, v) {
    if (oi.unit) return v + oi.unit;
    return v;
}

var PropertyLine = function () {
    function PropertyLine(obj, key, player) {
        (0, _classCallCheck3.default)(this, PropertyLine);

        this.list = [];
        this.target = obj;
        this.key = key;
        this.valueSet = jTimeline.access(obj, key);
        this.player = player;
        //this._cache = 0;
        //删除索引
        var line = obj._jtimeline.line[key];
        if (line) delete line._targets[obj._jtimeline.id].setter[key];
        obj._jtimeline.line[key] = player;
        /*
        if (line) {
            for (let temp in line._targets) {
                let ti = line._targets[temp].setter;
                for (let j in ti) return;
            }
            for (let temp in line._callbacks) return;
            line.kill();
        }
        */
    }

    (0, _createClass3.default)(PropertyLine, [{
        key: "push",
        value: function push(i) {
            //设置单位
            if (typeof i.from === "string") {
                var unit = /([^\d]+)/ig.exec(i.from);
                if (unit) jTimeline.unit = unit[1];
                i.from = parseFloat(i.from);
            }
            if (typeof i.to === "string") {
                if (!jTimeline.unit) {
                    var _unit = /([^\d]+)/ig.exec(i.to);
                    if (_unit) jTimeline.unit = _unit[1];
                }
                i.to = parseFloat(i.to);
            }
            if (this.list.length && this.list[this.list.length - 1].delay == i.delay) this.list.pop(); //除掉与自己重合的
            if (!this.list.length && i.delay > 0 && this.player.config.keepBeforeDelay) this._beforeDelay = this.valueSet(); //初始状态
            this.list.push(i);
        }
    }, {
        key: "clear",
        value: function clear() {
            var line = this.target._jtimeline.line[this.key];
            if (line[this.key] == this.player) delete line[this.key];
            this.player = null;
        }
    }, {
        key: "valueAt",
        value: function valueAt(time) {
            if (!this.a) {
                this.a = 1;
            }
            for (var i = 0; i < this.list.length; ++i) {
                var oi = this.list[i];
                if (oi.delay <= time && oi.duration + oi.delay >= time || i + 1 >= this.list.length || this.list[i + 1].delay > time) {
                    var _i = (time - oi.delay) / oi.duration;
                    if (_i < 0) _i = 0;
                    if (_i > 1) _i = 1;
                    return _valueAtUnit(oi, _excuter(oi.from, oi.to, oi.ease, _i));
                } else if (time < oi.delay) {
                    return _valueAtUnit(oi, this.player.config.keepBeforeDelay ? this._beforeDelay : oi.from);
                }
            }
        }
    }]);
    return PropertyLine;
}();

//执行器


function _excuter(from, to, ease_fun, i) {
    return from + (to - from) * ease_fun(i);
};

//时间尺度的最小小数。单位为秒
var minValue = 0.0001;

var player_id = 0;

var Player = function (_EventEmitter) {
    (0, _inherits3.default)(Player, _EventEmitter);

    function Player(space, timeline, conf) {
        (0, _classCallCheck3.default)(this, Player);

        var _this = (0, _possibleConstructorReturn3.default)(this, (Player.__proto__ || (0, _getPrototypeOf2.default)(Player)).call(this));

        _this.config = (0, _extends3.default)({
            repeat: 1, //重复次数
            delay: 0, //延迟播放，受scale影响
            scale: 1, //时间缩放
            wait: 0, //每次播放结束后的等待时间
            reverse: 0, //反向播放
            keepBeforeDelay: jTimeline.keepBeforeDelay }, conf);

        _this._space = space;

        _this._duration = timeline._duration;
        _this._player_id = ++player_id;

        _this._targets = {};
        //callbacks
        var calls = timeline._callbacks;
        if (calls) {
            calls = calls.slice();
            calls.sort(function (a, b) {
                return a.delay - b.delay;
            });
        }
        _this._callbacks = calls;

        //fromTo
        var ol = timeline._list;

        var _loop = function _loop(i) {
            var oi = ol[i];
            var idx = oi.target._jtimeline;
            var lst = oi.list.slice();

            var minSort = minValue / lst.length;
            lst.sort(function (a, b) {
                return a.delay - b.delay + (a._jtimeline - b._jtimeline) * minSort; //按延时和顺序排序
            });

            //填充缺失的参数
            var setter = {};
            for (var j = 0; j < lst.length; ++j) {
                var lj = lst[j];
                if (lj.from) for (var k in lj.from) {
                    if (!setter[k]) setter[k] = new PropertyLine(oi.target, k, _this);
                    setter[k].push({
                        delay: lj.delay,
                        duration: lj.duration,
                        ease: lj.ease,
                        from: lj.from[k],
                        to: lj.to && k in lj.to ? lj.to[k] : setter[k].list.length ? setter[k].valueAt(lj.delay + lj.duration) : setter[k].valueSet()
                    });
                }
                if (lj.to) for (var _k in lj.to) {
                    if (lj.from && _k in lj.from) continue;
                    if (!setter[_k]) setter[_k] = new PropertyLine(oi.target, _k, _this);
                    setter[_k].push({
                        delay: lj.delay,
                        duration: lj.duration,
                        ease: lj.ease,
                        from: setter[_k].list.length ? setter[_k].valueAt(lj.delay) : setter[_k].valueSet(),
                        to: lj.to[_k]
                    });
                }
            }

            _this._targets[idx.id] = {
                target: oi.target,
                setter: setter
            };
        };

        for (var i in ol) {
            _loop(i);
        }
        _this._process = 0;
        _this._last_repeat = 0;

        if (_this._callbacks && _this._callbacks.length) _this._position = _this._getProcess();
        return _this;
    }

    (0, _createClass3.default)(Player, [{
        key: "play",
        value: function play() {
            if (this._killed) throw new Error("player is killed");
            if (1 == this._status) return;
            this._status = 1;
            this._space._addPlayer(this);
            this.emit("play");
        }
    }, {
        key: "pause",
        value: function pause() {
            if (2 == this._status) return;
            this._space._removePlayer(this);
            this._status = 2;
            this.emit("pause");
        }
    }, {
        key: "kill",
        value: function kill() {
            if (-1 == this._status) return;
            this._space._removePlayer(this);
            this._status = -1;
            for (var i in this._targets) {
                var ti = this._targets[i].setter;
                for (var j in ti) {
                    ti[j].clear();
                }
            }
            this._killed = true;
            this.emit("kill");
        }
    }, {
        key: "_onTick",
        value: function _onTick(dtime) {
            this._process += dtime * this.config.scale / 1000;
            //根据时间来算位置
            var all_len = this.config.delay + this._duration + this.config.wait;

            var times = Math.floor(this._process / all_len);
            if (isNaN(times)) times = 0;

            //最大重复次数
            if (this.config.repeat > 0 && times >= this.config.repeat) {
                this._setProgress(this._getStaticProcess(this._duration));
                this.kill();
                return;
            }

            //初始化
            var times_changed = times != this._last_repeat;
            if (times_changed) {
                this._last_repeat = times;
                this.emit("times", times);
            }
            this._setProgress(this._getProcess(), times_changed);
        }
    }, {
        key: "_isReverse",
        value: function _isReverse() {
            var reverse = this.config.reverse;
            if (reverse > 1) {
                var all_len = this.config.delay + this._duration + this.config.wait;
                var times = Math.floor(this._process / all_len);
                if (isNaN(times)) times = 0;
                if (this.config.repeat > 0 && times >= this.config.repeat) times = this.config.repeat - 1;
                reverse = (times - reverse) % 2;
            }
            return reverse;
        }
    }, {
        key: "_getProcess",
        value: function _getProcess() {
            //根据时间来算位置
            var all_len = this.config.delay + this._duration + this.config.wait;
            var this_time = this._process % all_len;
            if (isNaN(this_time)) this_time = this._process;
            var times = Math.floor(this._process / all_len);
            if (isNaN(times)) times = 0;
            if (this_time == 0 && times > this._last_repeat) {
                if (this._isReverse()) return 0;else return this._duration;
            } else if (this._isReverse()) {
                return Math.max(0, Math.min(this._duration, all_len - this_time - this.config.delay));
            }
            return Math.max(0, Math.min(this._duration, this_time - this.config.delay));
        }
    }, {
        key: "_getStaticProcess",
        value: function _getStaticProcess(time) {
            if (this._isReverse()) return this._duration - time;
            return time;
        }
    }, {
        key: "_setProgress",
        value: function _setProgress(time, times_changed, ignore_callbacks) {
            for (var i in this._targets) {
                var ti = this._targets[i].setter;
                for (var j in ti) {
                    ti[j].valueSet(ti[j].valueAt(time));
                }
            }

            if (this._callbacks && this._callbacks.length) {
                if (!ignore_callbacks) {
                    if (times_changed) {
                        //越过了边界
                        var limit1 = this._duration,
                            limit2 = 0;
                        if (this.config.reverse == 1) {
                            limit1 = 0;
                            limit2 = this._duration;
                        } else if (this.config.reverse > 1) {
                            limit1 = limit2 = this._isReverse() ? this._duration : 0;
                        }
                        this._setCallbackProcess(this._position, limit1);
                        this._setCallbackProcess(limit2, time);
                    } else {
                        this._setCallbackProcess(this._position, time);
                    }
                }
                this._position = time;
            }
            this.emit("progress");
        }
    }, {
        key: "_setCallbackProcess",
        value: function _setCallbackProcess(pre, time) {
            var a = Math.min(pre, time);
            var b = Math.max(pre, time);

            for (var i = 0; i < this._callbacks.length; ++i) {
                var ci = this._callbacks[i];
                if (ci.delay > a && ci.delay <= b || ci.delay == 0 && a == 0) ci.callback && ci.callback.call(this, time);
            }
        }
    }, {
        key: "reset",
        value: function reset() {
            if (!this._status) return;
            this._space._removePlayer(this);
            this._status = 0;
            this._process = 0;
            this._last_repeat = 0;
            this._setProgress(this._getStaticProcess(0), false, true); //reset时不需要调用回调函数
            this.emit("reset");
        }
    }, {
        key: "progress",
        value: function progress(v) {
            var all_len = this.config.delay + this._duration + this.config.wait;
            if (!arguments.length) {
                var val = this._process % all_len / all_len;
                if (val == 0 && this._process / all_len > this._last_repeat) return 1;
                return val;
            }
            this._process = this._last_repeat * all_len + Math.max(0, Math.min(1, v)) * all_len;

            this._setProgress(this._getProcess());
        }
    }]);
    return Player;
}(_events2.default);

var PlaySpace = function (_EventEmitter2) {
    (0, _inherits3.default)(PlaySpace, _EventEmitter2);

    function PlaySpace(fps) {
        (0, _classCallCheck3.default)(this, PlaySpace);

        var _this2 = (0, _possibleConstructorReturn3.default)(this, (PlaySpace.__proto__ || (0, _getPrototypeOf2.default)(PlaySpace)).call(this));

        _this2._dps = 0;
        _this2._fps = 0;
        _this2._paused = 0;
        _this2._timeScale = 1;
        _this2._player_list = {};
        _this2._next_ticks_id = 0;

        _this2.fps(fps);
        return _this2;
    }

    (0, _createClass3.default)(PlaySpace, [{
        key: "fps",
        value: function fps(v) {
            if (!arguments.length) return this._fps;
            this._fps = v;
            this._dps = this._fps ? 1000 / this._fps : 0;
        }
    }, {
        key: "_exeNextTicks",
        value: function _exeNextTicks() {
            if (this._next_ticks) {
                var temp = this._next_ticks;
                this._next_ticks = null;
                for (var k in temp) {
                    temp[k]();
                }
            }
        }
    }, {
        key: "_startTimer",
        value: function _startTimer() {
            var _this3 = this;

            if (this._killTimer) return;
            var aframe = jTimeline.requestAnimationFrame();
            var cframe = jTimeline.clearAnimationFrame();

            var _last_time = new Date().getTime();

            var ticker = function ticker() {
                if (!_this3._killTimer) return;
                var now = new Date().getTime();
                var dtime = now - _last_time;
                if (_this3._dps <= dtime) {
                    dtime *= _this3._timeScale;
                    _last_time = now;
                    for (var i in _this3._player_list) {
                        _this3._player_list[i]._onTick(dtime);
                    }_this3.emit("tick", dtime);
                    _this3._exeNextTicks();
                }
                timer = aframe(ticker);
            };
            this._killTimer = function () {
                if (timer) cframe(timer);
                _this3._killTimer = undefined;
                _this3._exeNextTicks();
            };
            var timer = aframe(ticker); //启动定时器
        }
    }, {
        key: "_addPlayer",
        value: function _addPlayer(player) {
            this._player_list[player._player_id] = player;
            if (!this._paused) this._startTimer();
        }

        //时间缩放

    }, {
        key: "timeScale",
        value: function timeScale(v) {
            if (!arguments.length) return this._timeScale;
            this._timeScale = v;
        }
    }, {
        key: "_removePlayer",
        value: function _removePlayer(player) {
            delete this._player_list[player._player_id];
            for (var i in this._player_list) {
                return;
            }this._killTimer && this._killTimer();
        }
    }, {
        key: "pause",
        value: function pause() {
            if (this._paused) return;
            this._paused = 1;
            this._killTimer && this._killTimer();
        }
    }, {
        key: "resume",
        value: function resume() {
            if (!this._paused) return;
            this._paused = 0;
            for (var i in this._player_list) {
                this._startTimer();
                return;
            }
        }

        //下一帧调用

    }, {
        key: "nextTick",
        value: function nextTick(callback, key) {
            if (!callback) return;
            if (!this._killTimer) {
                callback();
                return;
            }
            if (!this._next_ticks) this._next_ticks = {};
            if (!key) key = ++this._next_ticks_id;else {
                key = "str_" + key;
                this.clearNextTick(key);
            }
            this._next_ticks[key] = callback;
            return key;
        }

        //清除下一帧

    }, {
        key: "clearNextTick",
        value: function clearNextTick(id) {
            if (!this._next_ticks || !id) return;
            if (this._next_ticks[id]) delete this._next_ticks[id];
        }
    }, {
        key: "isPaused",
        value: function isPaused() {
            return this._paused;
        }
    }]);
    return PlaySpace;
}(_events2.default);

var jTimeline = function () {
    function jTimeline(space) {
        (0, _classCallCheck3.default)(this, jTimeline);

        if (!this || !(this instanceof jTimeline)) return new new jTimeline(space)();
        this._space = space || jTimeline.defaultSpace;
        this._duration = 0;
        this._list = {};
    }

    //平方函数

    //立方函数

    //4次方函数


    (0, _createClass3.default)(jTimeline, [{
        key: "add",


        //时间线
        value: function add(obj) {
            if (!obj || !obj.target || !obj.duration) {
                throw new Error("target or duration is undefined");
            }
            if (!obj.from && !obj.to) throw new Error("from and to are undefined at all");

            if (!obj.delay && obj.delay != 0) obj.delay = this._duration;
            if (!obj.ease) obj.ease = jTimeline.defaultEase || jTimeline.linear.easeOut;
            if (jTimeline.isArray(obj.target)) {
                var de1 = this.duration();
                for (var i = 0; i < obj.target.length; ++i) {
                    var obji = (0, _extends3.default)({}, obj);
                    obji.target = obj.target[i];
                    this.add(obji);
                }
                return this;
            }

            if (!obj.target._jtimeline) obj.target._jtimeline = {
                id: ++obj_id,
                line: {}
            };

            this._duration = Math.max(this._duration, obj.duration + obj.delay);

            var index = obj.target._jtimeline;

            if (!this._list[index.id]) this._list[index.id] = {
                target: obj.target,
                list: []
            };
            obj._jtimeline = this._list[index.id].list.length;
            this._list[index.id].list.push(obj);
            return this;
        }

        //从到

    }, {
        key: "fromTo",
        value: function fromTo(obj, duration, from, to, delay, ease_fun) {
            if (delay instanceof Function) {
                ease_fun = delay;
                delay = undefined;
            }
            return this.add({
                target: obj,
                duration: duration,
                from: from,
                to: to,
                delay: delay,
                ease: ease_fun
            });
        }
        //从

    }, {
        key: "from",
        value: function from(obj, duration, _from, delay, ease_fun) {
            return this.fromTo(obj, duration, _from, undefined, delay, ease_fun);
        }
        //到

    }, {
        key: "to",
        value: function to(obj, duration, _to, delay, ease_fun) {
            return this.fromTo(obj, duration, undefined, _to, delay, ease_fun);
        }
        //添加回调函数

    }, {
        key: "callback",
        value: function callback(_callback, delay) {
            if (!_callback) return this;
            if (!delay && delay != 0) delay = this._duration;else this._duration = Math.max(this._duration, delay);
            if (!this._callbacks) this._callbacks = [];
            this._callbacks.push({
                callback: _callback,
                delay: delay
            });
            return this;
        }
        //添加其他的时间线，只会拷贝当前状态，当已添加的时间线被修改时，不会影响到当前时间线

    }, {
        key: "addTimeline",
        value: function addTimeline(line, delay, scale, reverse) {
            if (!delay && delay != 0) delay = this._duration;
            scale = scale || 1;
            for (var i in line._list) {
                var list = line._list[i].list;
                for (var j = 0; j < list.length; ++j) {
                    var _oi = list[j];
                    this.add({
                        target: _oi.target,
                        duration: _oi.duration * scale,
                        from: reverse ? _oi.to : _oi.from,
                        to: reverse ? _oi.from : _oi.to,
                        delay: (reverse ? line._duration - _oi.delay - _oi.duration : _oi.delay) * scale + delay,
                        ease: reverse ? createLineIn(_oi.ease) : _oi.ease
                    });
                }
            }
            if (line._callbacks) for (var _i2 = 0; _i2 < line._callbacks.length; ++_i2) {
                var _oi2 = line._callbacks[_i2];
                this.callback(_oi2.callback, (reverse ? line._duration - _oi2.delay - _oi2.duration : _oi2.delay) * scale + delay);
            }
            return this;
        }
        //时间线长度

    }, {
        key: "duration",
        value: function duration() {
            return this._duration;
        }
    }, {
        key: "delay",
        value: function delay(t) {
            this._duration += t;
            return this;
        }

        /** 播放，将产生一个播放对象，而不修改源对象
         * repeat: 1, //重复次数
         * delay: 0, //延迟播放，受scale影响
         * scale: 1, //时间缩放
         * wait: 0, //每次播放结束后的等待时间
         * reverse: 0, //反向播放
         * keepBeforeDelay: jTimeline.keepBeforeDelay //在播放到指定的属性之前，保持当前状态
         * space: undefined //计时器
        */

    }, {
        key: "play",
        value: function play(config) {
            var player = new Player(config && config.space || this._space, this, config);
            player.progress(0);
            if (!player.config.paused) player.play();
            return player;
        }

        //使用的快捷方式

    }], [{
        key: "access",

        //获得读写器，可重写这个方法来改变行为
        value: function access(obj, key) {
            for (var i = 0; i < jTimeline._accessList.length; ++i) {
                var ret = jTimeline._accessList[i](obj, key);
                if (ret) return ret;
            }
        }
    }, {
        key: "isArray",

        //数组判断， 如果要支持jQuery对象，请重写这个方法
        value: function isArray(obj) {
            for (var i = 0; i < jTimeline._isArrayList.length; ++i) {
                if (jTimeline._isArrayList[i](obj)) return true;
            }
            return false;
        }

        //定时器实现。支持所有实现了setTimeout的平台

    }, {
        key: "requestAnimationFrame",
        value: function (_requestAnimationFrame) {
            function requestAnimationFrame() {
                return _requestAnimationFrame.apply(this, arguments);
            }

            requestAnimationFrame.toString = function () {
                return _requestAnimationFrame.toString();
            };

            return requestAnimationFrame;
        }(function () {
            try {
                return requestAnimationFrame || webkitRequestAnimationFrame || mozRequestAnimationFrame || msRequestAnimationFrame || requireTimeout;
            } catch (e) {
                return requireTimeout;
            }
        })
        //清除定时器

    }, {
        key: "clearAnimationFrame",
        value: function clearAnimationFrame() {
            try {
                return cancelAnimationFrame || webkitCancelAnimationFrame || mozCancelAnimationFrame || msCancelAnimationFrame || clearTimeout;
            } catch (e) {
                return clearTimeout;
            }
        }
    }, {
        key: "fromTo",
        value: function fromTo(tar, duration, from, to, delay, ease_fun) {
            return new jTimeline().fromTo(tar, duration, from, to, delay, ease_fun).play();
        }
    }, {
        key: "from",
        value: function from(tar, duration, _from2, delay, ease_fun) {
            return new jTimeline().from(tar, duration, _from2, delay, ease_fun).play();
        }
    }, {
        key: "to",
        value: function to(tar, duration, _to2, delay, ease_fun) {
            return new jTimeline().to(tar, duration, _to2, delay, ease_fun).play();
        }
    }, {
        key: "timeout",
        value: function timeout(callback, delay) {
            return new jTimeline().callback(callback, delay).play();
        }
    }, {
        key: "temp",
        value: function temp(progress, from) {
            var _val = from || 0;
            return {
                val: function val(v) {
                    if (!arguments.length) return _val;
                    progress(v);
                    _val = v;
                }
            };
        }
    }, {
        key: "playSpace",
        value: function playSpace(fps) {
            return new PlaySpace(fps);
        }

        //默认play

    }]);
    return jTimeline;
}();

//匀速函数


jTimeline.createEase = createEase;
jTimeline.bounce = createEase(function (v) {
    var zoom = 0.2;
    var t1 = 1;
    var t2 = Math.sqrt(zoom) * 2;
    var t3 = zoom * 2;
    var tall = t1 + t2 + t3;
    t1 /= tall;
    t2 /= tall;
    t3 /= tall;
    if (v <= t1) {
        return Math.pow(v / t1, 2);
    } else if (v <= t1 + t2) {
        return 1 - zoom + Math.pow((v - t1 - t2 / 2) / (t2 / 2), 2) * zoom;
    } else {
        return 1 - zoom * zoom + Math.pow((v - t1 - t2 - t3 / 2) / (t3 / 2), 2) * zoom * zoom;
    }
});
jTimeline.linear = createEase(function (v) {
    return Math.sin(Math.PI * v / 2);
});
jTimeline.back = createEase(function (v) {
    var out = 0.06,
        tout = 0.3;
    //g1 = 2;
    var t1 = 1;
    //g2 * t2 * t2 = 2 * out;
    //g2 * t2 = g1 * t1;
    //-> t2 = out;
    //因为是减速回弹，过程有两个
    var t2 = tout;
    var t3 = t2 * Math.sqrt(2);
    var tall = t1 + t2 + t3;
    t1 /= tall;
    t2 /= tall;
    t3 /= tall;
    if (v <= t1) {
        return Math.pow(v / t1, 2);
    } else if (v <= t1 + t2 + t3 / 2) {
        return 1 + out - Math.pow((v - t1 - t2) / t2, 2) * out;
    } else {
        return 1 + Math.pow((v - 1) / t2, 2) * out;
    }
});
jTimeline.square = createEase(function (v) {
    var ev = 1 - v;
    return 1 - ev * ev;
});
jTimeline.cube = createEase(function (v) {
    var ev = 1 - v;
    return 1 - ev * ev * ev;
});
jTimeline.quad = createEase(function (v) {
    var ev = 1 - v;
    return 1 - ev * ev * ev * ev;
});
jTimeline._accessList = [function (obj, key) {
    if (obj && key in obj) {
        if (typeof obj[key] === "function") {
            var isSet = key.substr(0, 3);
            if (isSet == "get" || isSet == "set") return setter_set(obj, key);
            return method_set(obj, key);
        }
        return property_set(obj, key);
    }
}];
jTimeline._isArrayList = [function (obj) {
    return obj instanceof Array;
}];
jTimeline.defaultSpace = new PlaySpace();
exports.default = jTimeline;
jTimeline.linear.easeNone = function (v) {
    return v;
};

//默认动效
jTimeline.defaultEase = jTimeline.linear.easeOut;