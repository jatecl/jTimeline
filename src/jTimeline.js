//特别说明，这个动画库在动画运行过程中会添加附加属性_jtimeline

var jTimeline = (function () {

    /**
	 * @property 类型方法
	 */
    var cls = {
        copy: function (obj) {
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; ++i) {
                    for (var k in arguments[i]) obj[k] = arguments[i][k];
                }
            }
            return obj;
        },
        or: function (a, b, c) {
            for (var i = 0; i < b.length; ++i) {
                var oi = a[b[i] + c];
                if (oi) return oi;
            }
        },
        //事件模版
        events: {
            /**
			 * @method 注册事件
			 * @param event_name 时间名称
			 * @param callback 事件回调
			 */
            on: function (event_name, callback) {
                if (!this._events) this._events = {};
                if (!this._events[event_name]) this._events[event_name] = [];
                this._events[event_name].push(callback);
                return this;
            },
            /**
			 * @method 注销事件
			 * @param event_name 事件名称
			 * @param callback 要注销的回调。如果为空则注销该事件的所有回调。
			 */
            off: function (event_name, callback) {
                if (!this._events) return this;
                var el = this._events[event_name];
                if (!el) return this;
                if (!callback || (el.length == 1 && el[0] == callback)) {
                    this._events[event_name] = [];
                    delete this._events[event_name];
                }
                else {
                    for (var i = 0; i < el.length; ++i) {
                        if (el[i] == callback) {
                            el.splice(i, 1);
                            break;
                        }
                    }
                }
                return this;
            },
            /**
			 * @method 触发事件
			 * @param event_name 触发的事件名称
			 */
            trigger: function (event_name) {
                if (!this._events) return this;
                var el = this._events[event_name];
                if (!el || !el.length) return this;
                var args = [];
                for (var i = 1; i < arguments.length; ++i) {
                    args.push(arguments[i]);
                }
                for (var i = 0; i < el.length; ++i) {
                    el[i].apply(this, args);
                }
                return this;
            }
        },
        /**
		 * @method 为对象添加事件支持
		 */
        createEventSupport: function (prototype) {
            this.copy(prototype, this.events);
        }
    };



    var t = function () {
        if (!this || !(this instanceof t)) return new t();
        this._duration = 0;
        this._list = {};
    };
    //动态
    var ease = {};


    //拼合两个函数
    var createLineInOut = function (inf, out) {
        return function (v) {
            if (v < 0.5) return inf(v * 2) / 2;
            return out((v - 0.5) * 2) / 2 + 0.5;
        };
    };
    //反向函数
    var createLineIn = function (out) {
        return function (v) {
            return 1 - out(1 - v);
        };
    };
    //创建规则函数群
    t.createEase = function (name, outFunction) {
        var inFunction = createLineIn(outFunction);
        ease[name] = {
            easeOut: outFunction,
            easeIn: inFunction,
            easeInOut: createLineInOut(inFunction, outFunction),
            easeOutIn: createLineInOut(outFunction, inFunction)
        };
    };
    //加速弹跳函数
    t.createEase("bounce", function (v) {
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
        }
        else if (v <= t1 + t2) {
            return 1 - zoom + Math.pow((v - t1 - t2 / 2) / (t2 / 2), 2) * zoom;
        }
        else {
            return 1 - zoom * zoom + Math.pow((v - t1 - t2 - t3 / 2) / (t3 / 2), 2) * zoom * zoom;
        }
    });
    //减速函数 
    t.createEase("linear", function (v) { return Math.sin(Math.PI * v / 2); });
    //加速冲出回弹
    t.createEase("back", function (v) {
        var out = 0.06, tout = 0.3;
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
        }
        else if (v <= t1 + t2 + t3 / 2) {
            return 1 + out - Math.pow((v - t1 - t2) / t2, 2) * out;
        }
        else {
            return 1 + Math.pow((v - 1) / t2, 2) * out;
        }
    });
    //平方函数
    t.createEase("square", function (v) {
        var ev = 1 - v;
        return 1 - ev * ev;
    });
    //立方函数
    t.createEase("cube", function (v) {
        var ev = 1 - v;
        return 1 - ev * ev * ev;
    });
    //4次方函数
    t.createEase("quad", function (v) {
        var ev = 1 - v;
        return 1 - ev * ev * ev * ev;
    });
    //匀速函数
    ease.linear.easeNone = function (v) { return v; };

    //各种取值方式
    var property_set = function (obj, key) {
        return function (val) {
            if (arguments.length) obj[key] = val;
            else return obj[key];
        };
    };

    var method_set = function (obj, key) {
        return function (val) {
            if (!arguments.length) return obj[key]();
            obj[key](val);
        };
    };

    var setter_set = function (obj, key) {
        var set_key = "set" + key.substr(3);
        return function (val) {
            if (arguments.length) obj[set_key](val);
            else return obj[key]();
        };
    };

    //获得读写器，可重写这个方法来改变行为
    t.access = function (obj, key) {
        if (obj && (key in obj)) {
            if (typeof obj[key] === "function") {
                if (key.substr(0, 3) == "get") return setter_set(obj, key);
                return method_set(obj, key);
            }
            return property_set(obj, key);
        }
    };
    //默认动效
    t.defaultEase = ease.linear.easeOut;

    //动效列表
    t.ease = ease;
    //数组判断， 如果要支持jQuery对象，请重写这个方法
    t.isArray = function (obj) {
        return obj instanceof Array;
    };


    var obj_id = 0;

    //时间线
    t.prototype.add = function (obj) {
        if (!obj || !obj.target || !obj.duration) throw new Error("target or duration is undefined");
        if (!obj.from && !obj.to) throw new Error("from and to are undefined at all");
        if (t.isArray(obj.target)) {
            for (var i = 0; i < obj.target.length; ++i) {
                var obji = cls.copy({}, obj);
                obji.target = obj.target[i];
                this.add(obji);
            }
            return this;
        }

        if (!obj.target._jtimeline) obj.target._jtimeline = {
            id: ++obj_id,
            line: {}
        };

        if (!obj.delay && obj.delay != 0) obj.delay = this._duration;
        if (!obj.ease) obj.ease = t.defaultEase || ease.linear.easeOut;
        this._duration = Math.max(this._duration, obj.duration + obj.delay);

        var index = obj.target._jtimeline;

        if (!this._list[index.id]) this._list[index.id] = {
            target: obj.target,
            list: []
        };
        obj._jtimeline = this._list[index.id].list.length;
        this._list[index.id].list.push(obj);
        return this;
    };

    //从到
    t.prototype.fromTo = function (obj, duration, from, to, delay, ease_fun) {
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
    };
    //从
    t.prototype.from = function (obj, duration, from, delay, ease_fun) {
        return this.fromTo(obj, duration, from, undefined, delay, ease_fun);
    };
    //到
    t.prototype.to = function (obj, duration, to, delay, ease_fun) {
        return this.fromTo(obj, duration, undefined, to, delay, ease_fun);
    };
    //添加回调函数
    t.prototype.callback = function (callback, delay) {
        if (!callback) return;
        if (!delay && delay != 0) delay = this._duration;
        else this._duration = Math.max(this._duration, delay);
        if (!this._callbacks) this._callbacks = [];
        this._callbacks.push({
            callback: callback,
            delay: delay
        });
        return this;
    };
    //添加其他的时间线，只会拷贝当前状态，当已添加的时间线被修改时，不会影响到当前时间线
    t.prototype.addTimeline = function (line, delay, scale, reverse) {
        if (!delay && delay != 0) delay = this._duration;
        scale = scale || 1;
        for (var i in line._list) {
            var list = line._list[i].list;
            for (var j = 0; j < list.length; ++j) {
                var oi = list[j];
                this.add({
                    target: oi.target,
                    duration: oi.duration * scale,
                    from: reverse ? oi.to : oi.from,
                    to: reverse ? oi.from : oi.to,
                    delay: (reverse ? line._duration - oi.delay - oi.duration : oi.delay) * scale + delay,
                    ease: reverse ? createLineIn(oi.ease) : oi.ease
                });
            }
        }
        return this;
    };
    //时间线长度
    t.prototype.duration = function () {
        return this._duration;
    };


    var PropertyLine = function (obj, key, player) {
        this.list = [];
        this.target = obj;
        this.key = key;
        this.valueSet = t.access(obj, key);
        this.player = player;
        this._cache = 0;
        //删除索引
        var line = obj._jtimeline.line[key];
        if (line) delete line._targets[obj._jtimeline.id].setter[key];
        obj._jtimeline.line[key] = player;
    };
    PropertyLine.prototype.push = function (i) {
        if (this.list.length && this.list[this.list.length - 1].delay == i.delay) this.list.pop();
        if (!this.list.length && i.delay > 0 && this.player.config.keepBeforeDelay) this._beforeDelay = this.valueSet();
        this.list.push(i);
    };
    PropertyLine.prototype.clear = function () {
        var line = this.target._jtimeline.line[this.key];
        if (line[this.key] == this.player) delete line[this.key];
        this.player = null;
    };
    PropertyLine.prototype.valueAt = function (time) {
        while (true) {
            var ended = this._cache >= this.list.length - 1;
            var oi = this.list[this._cache];
            if (oi.delay <= time && oi.duration + oi.delay >= time && (ended || this.list[this._cache + 1].delay > time)) {
                var i = (time - oi.delay) / oi.duration;
                return _excuter(oi.from, oi.to, oi.ease, i);
            } else if (time < oi.delay) {
                if (this._cache == 0) return this.player.config.keepBeforeDelay ? this._beforeDelay : oi.from;
                --this._cache;
            } else {
                if (ended) return oi.to;
                ++this._cache;
            }
        }
    };


    //执行器
    var _excuter = function (from, to, ease_fun, i) {
        return from + (to - from) * ease_fun(i);
    };


    //时间尺度的最小小数。单位为秒
    var minValue = 0.0001;

    var player_id = 0;
    var Player = function (timeline, conf) {
        this.config = cls.copy({
            repeat: 1, //重复次数
            delay: 0, //延迟播放，受scale影响
            scale: 1, //时间缩放
            wait: 0, //每次播放结束后的等待时间
            reverse: 0, //反向播放
            keepBeforeDelay: t.keepBeforeDelay //在播放到指定的属性之前，保持当前状态
        }, conf);

        this._duration = timeline._duration;
        this._player_id = ++player_id;

        this._targets = {};
        //callbacks
        var calls = timeline._callbacks;
        if (calls) {
            calls = calls.slice();
            calls.sort(function (a, b) {
                return a.delay - b.delay;
            });
        }
        this._callbacks = calls;

        //fromTo
        var ol = timeline._list;
        for (var i in ol) {
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
                    if (!setter[k]) setter[k] = new PropertyLine(oi.target, k, this);
                    setter[k].push({
                        delay: lj.delay,
                        duration: lj.duration,
                        ease: lj.ease,
                        from: lj.from[k],
                        to: lj.to && (k in lj.to) ? lj.to[k] : setter[k].list.length ? setter[k].valueAt(lj.delay + lj.duration) : setter[k].valueSet()
                    })
                }
                if (lj.to) for (var k in lj.to) {
                    if (lj.from && (k in lj.from)) continue;
                    if (!setter[k]) setter[k] = new PropertyLine(oi.target, k, this);
                    setter[k].push({
                        delay: lj.delay,
                        duration: lj.duration,
                        ease: lj.ease,
                        from: setter[k].list.length ? setter[k].valueAt(lj.delay) : setter[k].valueSet(),
                        to: lj.to[k]
                    });
                }
            }

            this._targets[idx.id] = {
                target: oi.target,
                setter: setter
            };
        }
        this._process = 0;
        this._last_repeat = 0;

        if (this._callbacks && this._callbacks.length) this._position = _getProcess.call(this);
    };
    cls.createEventSupport(Player.prototype);
    Player.prototype.play = function () {
        if (this._killed) throw new Error("player is killed");
        if (1 == this._status) return;
        this._status = 1;
        this._last_time = new Date().getTime();
        _addPlayer(this);
        this.trigger("play");
    };
    Player.prototype.pause = function () {
        if (2 == this._status) return;
        _removePlayer(this);
        this._status = 2;
        this.trigger("pause");
    };
    Player.prototype.kill = function () {
        if (-1 == this._status) return;
        _removePlayer(this);
        this._status = -1;
        for (var i in this._targets) {
            var ti = this._targets[i].setter;
            for (var j in ti) ti[j].clear();
        }
        this._killed = true;
        this.trigger("kill");
    };
    var _onTick = function () {
        var now = new Date().getTime();
        var dtime = now - this._last_time;
        this._last_time = now;

        this._process += dtime * this.config.scale / 1000;
        //根据时间来算位置
        var all_len = this.config.delay + this._duration + this.config.wait;

        var times = Math.floor(this._process / all_len);

        //最大重复次数
        if (this.config.repeat > 0 && times >= this.config.repeat) {
            _setProcess.call(this, _getStaticProcess.call(this, this._duration));
            this.kill();
            return;
        }

        //初始化
        var times_changed = times != this._last_repeat;
        if (times_changed) {
            this._last_repeat = times;
            this.trigger("times", times);
        }
        _setProcess.call(this, _getProcess.call(this), times_changed);
    };
    var _isReverse = function () {
        var reverse = this.config.reverse;
        if (reverse > 1) {
            var all_len = this.config.delay + this._duration + this.config.wait;
            var times = Math.floor(this._process / all_len);
            if (this.config.repeat > 0 && times >= this.config.repeat) times = this.config.repeat - 1;
            reverse = (times - reverse) % 2;
        }
        return reverse;
    };
    var _getProcess = function () {
        //根据时间来算位置
        var all_len = this.config.delay + this._duration + this.config.wait;
        var this_time = this._process % all_len;
        if (this_time == 0 && this._process / all_len > this._last_repeat) {
            if (_isReverse.call(this)) return 0;
            else return this._duration;
        } else if (_isReverse.call(this)) {
            return Math.max(0, Math.min(this._duration, all_len - this_time - this.config.delay));
        }
        return Math.max(0, Math.min(this._duration, this_time - this.config.delay));
    };
    var _getStaticProcess = function (time) {
        if (_isReverse.call(this)) return this._duration - time;
        return time;
    };
    var _setProcess = function (time, times_changed, ignore_callbacks) {
        for (var i in this._targets) {
            var ti = this._targets[i].setter;
            for (var j in ti) ti[j].valueSet(ti[j].valueAt(time));
        }

        if (this._callbacks && this._callbacks.length) {
            if (!ignore_callbacks) {
                if (times_changed) { //越过了边界
                    var limit1 = this._duration, limit2 = 0;
                    if (this.config.reverse == 1) {
                        limit1 = 0;
                        limit2 = this._duration;
                    } else if (this.config.reverse > 1) {
                        limit1 = limit2 = _isReverse.call(this) ? this._duration : 0;
                    }
                    _setCallbackProcess.call(this, this._position, limit1);
                    _setCallbackProcess.call(this, limit2, time);
                } else {
                    _setCallbackProcess.call(this, this._position, time);
                }
            }
            this._position = time;
        }
        this.trigger("process");
    };
    var _setCallbackProcess = function (pre, time) {
        var a = Math.min(pre, time);
        var b = Math.max(pre, time);

        for (var i = 0; i < this._callbacks.length; ++i) {
            var ci = this._callbacks[i];
            if ((ci.delay > a && ci.delay <= b) || (ci.delay == 0 && a == 0)) ci.callback && ci.callback.call(this, time);
        }
    };
    Player.prototype.reset = function () {
        if (!this._status) return;
        _removePlayer(this);
        this._status = 0;
        this._process = 0;
        this._last_repeat = 0;
        _setProcess.call(this, _getStaticProcess.call(this, 0), false, true); //reset时不需要调用回调函数
        this.trigger("reset");
    };
    Player.prototype.process = function (v) {
        var all_len = this.config.delay + this._duration + this.config.wait;
        if (!arguments.length) {
            var val = (this._process % all_len) / all_len;
            if (val == 0 && this._process / all_len > this._last_repeat) return 1;
            return val;
        }
        this._process = this._last_repeat * all_len + Math.max(0, Math.min(1, v)) * all_len;

        _setProcess.call(this, _getProcess.call(this));
    };

    var requireTimeout = function (callback) { return setTimeout(callback, 16); };
    //定时器实现。支持所有实现了setTimeout的平台
    t.requestAnimationFrame = function () {
        try {
            return cls.or(window, 'r,webkitR,msR,mozR'.split(','), 'equestAnimationFrame') || requireTimeout;
        } catch (e) {
            return requireTimeout;
        }
    };
    //清除定时器
    t.clearAnimationFrame = function () {
        try {
            return cls.or(window, 'c,webkitC,msC,mozC'.split(','), 'ancelAnimationFrame') || clearTimeout;
        } catch (e) {
            return clearTimeout;
        }
    };

    var _killTimer;
    var _startTimer = function () {
        if (_killTimer) return;
        var aframe = t.requestAnimationFrame();
        var cframe = t.clearAnimationFrame();

        var ticker = function () {
            if (!_killTimer) return;
            for (var i in player_list) _onTick.call(player_list[i]);
            timer = aframe(ticker);
        };
        _killTimer = function () {
            if (timer) cframe(timer);
            _killTimer = undefined;
        };
        var timer = aframe(ticker); //启动定时器
    };

    var player_list = {};
    var _addPlayer = function (player) {
        player_list[player._player_id] = player;
        _startTimer();
    };

    var _removePlayer = function (player) {
        delete player_list[player._player_id];
        for (var i in player_list) return;
        _killTimer && _killTimer();
    };

    //播放，将产生一个播放对象，而不修改源对象
    t.prototype.play = function (config) {
        var player = new Player(this, config);
        player.play();
        return player;
    };

    //使用的快捷方式
    t.fromTo = function (tar, duration, from, to, delay, ease_fun) {
        return t().fromTo(tar, duration, from, to, delay, ease_fun).play();
    };
    t.from = function (tar, duration, from, delay, ease_fun) {
        return t().from(tar, duration, from, delay, ease_fun).play();
    };
    t.to = function (tar, duration, to, delay, ease_fun) {
        return t().to(tar, duration, to, delay, ease_fun).play();
    };

    return t;
})();