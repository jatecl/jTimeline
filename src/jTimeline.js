import EventEmitter from "events";

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
    let inFunction = createLineIn(outFunction);
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
        if (arguments.length) obj[key] = val;
        else return obj[key];
    };
}

function method_set(obj, key) {
    return function (val) {
        if (!arguments.length) return obj[key]();
        obj[key](val);
    };
}

function setter_set(obj, key) {
    let subKey = key.substr(3);
    let set_key = "set" + subKey;
    let get_key = "get" + subKey;
    return function (val) {
        if (arguments.length) obj[set_key](val);
        else return obj[get_key]();
    };
}
function requireTimeout(callback) {
    return setTimeout(callback, 16);
}



let obj_id = 0;

function _valueAtUnit(oi, v) {
    if (oi.unit) return v + oi.unit;
    return v;
}
class PropertyLine {
    constructor(obj, key, player) {
        this.list = [];
        this.target = obj;
        this.key = key;
        this.valueSet = jTimeline.access(obj, key);
        this.player = player;
        //this._cache = 0;
        //删除索引
        let line = obj._jtimeline.line[key];
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
    push(i) {
        //设置单位
        if (typeof i.from === "string") {
            let unit = /([^\d]+)/ig.exec(i.from);
            if (unit) jTimeline.unit = unit[1];
            i.from = parseFloat(i.from);
        }
        if (typeof i.to === "string") {
            if (!jTimeline.unit) {
                let unit = /([^\d]+)/ig.exec(i.to);
                if (unit) jTimeline.unit = unit[1];
            }
            i.to = parseFloat(i.to);
        }
        if (this.list.length && this.list[this.list.length - 1].delay == i.delay) this.list.pop(); //除掉与自己重合的
        if (!this.list.length && i.delay > 0 && this.player.config.keepBeforeDelay) this._beforeDelay = this.valueSet(); //初始状态
        this.list.push(i);
    }
    clear() {
        let line = this.target._jtimeline.line[this.key];
        if (line[this.key] == this.player) delete line[this.key];
        this.player = null;
    }
    valueAt(time) {
        if (!this.a) {
            this.a = 1;
        }
        for (let i = 0; i < this.list.length; ++i) {
            let oi = this.list[i];
            if ((oi.delay <= time && oi.duration + oi.delay >= time) || i + 1 >= this.list.length || this.list[i + 1].delay > time) {
                let i = (time - oi.delay) / oi.duration;
                if (i < 0) i = 0;
                if (i > 1) i = 1;
                return _valueAtUnit(oi, _excuter(oi.from, oi.to, oi.ease, i));
            } else if (time < oi.delay) {
                return _valueAtUnit(oi, this.player.config.keepBeforeDelay ? this._beforeDelay : oi.from);
            }
        }
    }
}


//执行器
function _excuter(from, to, ease_fun, i) {
    return from + (to - from) * ease_fun(i);
};


//时间尺度的最小小数。单位为秒
let minValue = 0.0001;

let player_id = 0;
class Player extends EventEmitter {
    constructor(space, timeline, conf) {
        super();
        this.config = {
            repeat: 1, //重复次数
            delay: 0, //延迟播放，受scale影响
            scale: 1, //时间缩放
            wait: 0, //每次播放结束后的等待时间
            reverse: 0, //反向播放
            keepBeforeDelay: jTimeline.keepBeforeDelay, //在播放到指定的属性之前，保持当前状态
            ...conf
        };

        this._space = space;

        this._duration = timeline._duration;
        this._player_id = ++player_id;

        this._targets = {};
        //callbacks
        let calls = timeline._callbacks;
        if (calls) {
            calls = calls.slice();
            calls.sort(function (a, b) {
                return a.delay - b.delay;
            });
        }
        this._callbacks = calls;

        //fromTo
        let ol = timeline._list;
        for (let i in ol) {
            let oi = ol[i];
            let idx = oi.target._jtimeline;
            let lst = oi.list.slice();

            let minSort = minValue / lst.length;
            lst.sort(function (a, b) {
                return a.delay - b.delay + (a._jtimeline - b._jtimeline) * minSort; //按延时和顺序排序
            });

            //填充缺失的参数
            let setter = {};
            for (let j = 0; j < lst.length; ++j) {
                let lj = lst[j];
                if (lj.from) for (let k in lj.from) {
                    if (!setter[k]) setter[k] = new PropertyLine(oi.target, k, this);
                    setter[k].push({
                        delay: lj.delay,
                        duration: lj.duration,
                        ease: lj.ease,
                        from: lj.from[k],
                        to: lj.to && (k in lj.to) ? lj.to[k] : setter[k].list.length ? setter[k].valueAt(lj.delay + lj.duration) : setter[k].valueSet()
                    })
                }
                if (lj.to) for (let k in lj.to) {
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

        if (this._callbacks && this._callbacks.length) this._position = this._getProcess();
    }

    play() {
        if (this._killed) throw new Error("player is killed");
        if (1 == this._status) return;
        this._status = 1;
        this._space._addPlayer(this);
        this.emit("play");
    }
    pause() {
        if (2 == this._status) return;
        this._space._removePlayer(this);
        this._status = 2;
        this.emit("pause");
    }
    kill() {
        if (-1 == this._status) return;
        this._space._removePlayer(this);
        this._status = -1;
        for (let i in this._targets) {
            let ti = this._targets[i].setter;
            for (let j in ti) ti[j].clear();
        }
        this._killed = true;
        this.emit("kill");
    }
    _onTick(dtime) {
        this._process += dtime * this.config.scale / 1000;
        //根据时间来算位置
        let all_len = this.config.delay + this._duration + this.config.wait;

        let times = Math.floor(this._process / all_len);
        if (isNaN(times)) times = 0;

        //最大重复次数
        if (this.config.repeat > 0 && times >= this.config.repeat) {
            this._setProgress(this._getStaticProcess(this._duration));
            this.kill();
            return;
        }

        //初始化
        let times_changed = times != this._last_repeat;
        if (times_changed) {
            this._last_repeat = times;
            this.emit("times", times);
        }
        this._setProgress(this._getProcess(), times_changed);
    }
    _isReverse() {
        let reverse = this.config.reverse;
        if (reverse > 1) {
            let all_len = this.config.delay + this._duration + this.config.wait;
            let times = Math.floor(this._process / all_len);
            if (isNaN(times)) times = 0;
            if (this.config.repeat > 0 && times >= this.config.repeat) times = this.config.repeat - 1;
            reverse = (times - reverse) % 2;
        }
        return reverse;
    }
    _getProcess() {
        //根据时间来算位置
        let all_len = this.config.delay + this._duration + this.config.wait;
        let this_time = this._process % all_len;
        if (isNaN(this_time)) this_time = this._process;
        let times = Math.floor(this._process / all_len);
        if (isNaN(times)) times = 0;
        if (this_time == 0 && times > this._last_repeat) {
            if (this._isReverse()) return 0;
            else return this._duration;
        } else if (this._isReverse()) {
            return Math.max(0, Math.min(this._duration, all_len - this_time - this.config.delay));
        }
        return Math.max(0, Math.min(this._duration, this_time - this.config.delay));
    }
    _getStaticProcess(time) {
        if (this._isReverse()) return this._duration - time;
        return time;
    }
    _setProgress(time, times_changed, ignore_callbacks) {
        for (let i in this._targets) {
            let ti = this._targets[i].setter;
            for (let j in ti) ti[j].valueSet(ti[j].valueAt(time));
        }

        if (this._callbacks && this._callbacks.length) {
            if (!ignore_callbacks) {
                if (times_changed) { //越过了边界
                    let limit1 = this._duration, limit2 = 0;
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
    _setCallbackProcess(pre, time) {
        let a = Math.min(pre, time);
        let b = Math.max(pre, time);

        for (let i = 0; i < this._callbacks.length; ++i) {
            let ci = this._callbacks[i];
            if ((ci.delay > a && ci.delay <= b) || (ci.delay == 0 && a == 0)) ci.callback && ci.callback.call(this, time);
        }
    }
    reset() {
        if (!this._status) return;
        this._space._removePlayer(this);
        this._status = 0;
        this._process = 0;
        this._last_repeat = 0;
        this._setProgress(this._getStaticProcess(0), false, true); //reset时不需要调用回调函数
        this.emit("reset");
    }
    progress(v) {
        let all_len = this.config.delay + this._duration + this.config.wait;
        if (!arguments.length) {
            let val = (this._process % all_len) / all_len;
            if (val == 0 && this._process / all_len > this._last_repeat) return 1;
            return val;
        }
        this._process = this._last_repeat * all_len + Math.max(0, Math.min(1, v)) * all_len;

        this._setProgress(this._getProcess());
    }
}

class PlaySpace extends EventEmitter {
    constructor(fps) {
        super();
        this.fps(fps);
    }
    _dps = 0;
    _fps = 0;
    fps(v) {
        if (!arguments.length) return this._fps;
        this._fps = v;
        this._dps = this._fps ? 1000 / this._fps : 0;
    }
    _killTimer;
    _paused = 0;
    _next_ticks;
    _timeScale = 1;
    _player_list = {};
    _exeNextTicks() {
        if (this._next_ticks) {
            let temp = this._next_ticks;
            this._next_ticks = null;
            for (let k in temp) {
                temp[k]();
            }
        }
    }
    _startTimer() {
        if (this._killTimer) return;
        let aframe = jTimeline.requestAnimationFrame();
        let cframe = jTimeline.clearAnimationFrame();

        let _last_time = new Date().getTime();

        let ticker = () => {
            if (!this._killTimer) return;
            let now = new Date().getTime();
            let dtime = now - _last_time;
            if (this._dps <= dtime) {
                dtime *= this._timeScale;
                _last_time = now;
                for (let i in this._player_list) this._player_list[i]._onTick(dtime);
                this.emit("tick", dtime);
                this._exeNextTicks();
            }
            timer = aframe(ticker);
        };
        this._killTimer = () => {
            if (timer) cframe(timer);
            this._killTimer = undefined;
            this._exeNextTicks();
        };
        let timer = aframe(ticker); //启动定时器
    }
    _addPlayer(player) {
        this._player_list[player._player_id] = player;
        if (!this._paused) this._startTimer();
    }

    //时间缩放
    timeScale(v) {
        if (!arguments.length) return this._timeScale;
        this._timeScale = v;
    }

    _removePlayer(player) {
        delete this._player_list[player._player_id];
        for (let i in this._player_list) return;
        this._killTimer && this._killTimer();
    }

    pause() {
        if (this._paused) return;
        this._paused = 1;
        this._killTimer && this._killTimer();
    }

    resume() {
        if (!this._paused) return;
        this._paused = 0;
        for (let i in this._player_list) {
            this._startTimer();
            return;
        }
    }

    //下一帧调用
    _next_ticks_id = 0;
    nextTick(callback, key) {
        if (!callback) return;
        if (!this._killTimer) {
            callback();
            return;
        }
        if (!this._next_ticks) this._next_ticks = {};
        if (!key) key = ++this._next_ticks_id;
        else {
            key = "str_" + key;
            this.clearNextTick(key);
        }
        this._next_ticks[key] = callback;
        return key;
    }

    //清除下一帧
    clearNextTick(id) {
        if (!this._next_ticks || !id) return;
        if (this._next_ticks[id]) delete this._next_ticks[id];
    }

    isPaused() {
        return this._paused;
    }
}


export default class jTimeline {
    constructor(space) {
        if (!this || !(this instanceof jTimeline)) return new new jTimeline(space);
        this._space = space || jTimeline.defaultSpace;
        this._duration = 0;
        this._list = {};
    }

    static createEase = createEase;
    static bounce = createEase(v => {
        let zoom = 0.2;
        let t1 = 1;
        let t2 = Math.sqrt(zoom) * 2;
        let t3 = zoom * 2;
        let tall = t1 + t2 + t3;
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
    static linear = createEase(v => Math.sin(Math.PI * v / 2));
    static back = createEase(function (v) {
        let out = 0.06, tout = 0.3;
        //g1 = 2;
        let t1 = 1;
        //g2 * t2 * t2 = 2 * out;
        //g2 * t2 = g1 * t1;
        //-> t2 = out;
        //因为是减速回弹，过程有两个
        let t2 = tout;
        let t3 = t2 * Math.sqrt(2);
        let tall = t1 + t2 + t3;
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
    static square = createEase(v => {
        let ev = 1 - v;
        return 1 - ev * ev;
    });
    //立方函数
    static cube = createEase(v => {
        let ev = 1 - v;
        return 1 - ev * ev * ev;
    });
    //4次方函数
    static quad = createEase(v => {
        let ev = 1 - v;
        return 1 - ev * ev * ev * ev;
    });

    static _accessList = [(obj, key) => {
        if (obj && (key in obj)) {
            if (typeof obj[key] === "function") {
                let isSet = key.substr(0, 3);
                if (isSet == "get" || isSet == "set") return setter_set(obj, key);
                return method_set(obj, key);
            }
            return property_set(obj, key);
        }
    }];
    //获得读写器，可重写这个方法来改变行为
    static access(obj, key) {
        for (let i = 0; i < jTimeline._accessList.length; ++i) {
            let ret = jTimeline._accessList[i](obj, key);
            if (ret) return ret;
        }
    }
    static _isArrayList = [obj => obj instanceof Array];
    //数组判断， 如果要支持jQuery对象，请重写这个方法
    static isArray(obj) {
        for (let i = 0; i < jTimeline._isArrayList.length; ++i) {
            if (jTimeline._isArrayList[i](obj)) return true;
        }
        return false;
    }

    //定时器实现。支持所有实现了setTimeout的平台
    static requestAnimationFrame() {
        try {
            return requestAnimationFrame || webkitRequestAnimationFrame || mozRequestAnimationFrame || msRequestAnimationFrame || requireTimeout;
        } catch (e) {
            return requireTimeout;
        }
    }
    //清除定时器
    static clearAnimationFrame() {
        try {
            return cancelAnimationFrame || webkitCancelAnimationFrame || mozCancelAnimationFrame || msCancelAnimationFrame || clearTimeout;
        } catch (e) {
            return clearTimeout;
        }
    }

    //时间线
    add(obj) {
        if (!obj || !obj.target || !obj.duration) {
            throw new Error("target or duration is undefined");
        }
        if (!obj.from && !obj.to) throw new Error("from and to are undefined at all");

        if (!obj.delay && obj.delay != 0) obj.delay = this._duration;
        if (!obj.ease) obj.ease = jTimeline.defaultEase || jTimeline.linear.easeOut;
        if (jTimeline.isArray(obj.target)) {
            let de1 = this.duration();
            for (let i = 0; i < obj.target.length; ++i) {
                let obji = { ...obj };
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

        let index = obj.target._jtimeline;

        if (!this._list[index.id]) this._list[index.id] = {
            target: obj.target,
            list: []
        };
        obj._jtimeline = this._list[index.id].list.length;
        this._list[index.id].list.push(obj);
        return this;
    }

    //从到
    fromTo(obj, duration, from, to, delay, ease_fun) {
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
    from(obj, duration, from, delay, ease_fun) {
        return this.fromTo(obj, duration, from, undefined, delay, ease_fun);
    }
    //到
    to(obj, duration, to, delay, ease_fun) {
        return this.fromTo(obj, duration, undefined, to, delay, ease_fun);
    }
    //添加回调函数
    callback(callback, delay) {
        if (!callback) return this;
        if (!delay && delay != 0) delay = this._duration;
        else this._duration = Math.max(this._duration, delay);
        if (!this._callbacks) this._callbacks = [];
        this._callbacks.push({
            callback: callback,
            delay: delay
        });
        return this;
    }
    //添加其他的时间线，只会拷贝当前状态，当已添加的时间线被修改时，不会影响到当前时间线
    addTimeline(line, delay, scale, reverse) {
        if (!delay && delay != 0) delay = this._duration;
        scale = scale || 1;
        for (let i in line._list) {
            let list = line._list[i].list;
            for (let j = 0; j < list.length; ++j) {
                let oi = list[j];
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
        if (line._callbacks) for (let i = 0; i < line._callbacks.length; ++i) {
            let oi = line._callbacks[i];
            this.callback(oi.callback, (reverse ? line._duration - oi.delay - oi.duration : oi.delay) * scale + delay);
        }
        return this;
    }
    //时间线长度
    duration() {
        return this._duration;
    }
    delay(t) {
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
    play(config) {
        let player = new Player((config && config.space) || this._space, this, config);
        player.progress(0);
        if (!player.config.paused) player.play();
        return player;
    }


    //使用的快捷方式
    static fromTo(tar, duration, from, to, delay, ease_fun) {
        return new jTimeline().fromTo(tar, duration, from, to, delay, ease_fun).play();
    }
    static from(tar, duration, from, delay, ease_fun) {
        return new jTimeline().from(tar, duration, from, delay, ease_fun).play();
    }
    static to(tar, duration, to, delay, ease_fun) {
        return new jTimeline().to(tar, duration, to, delay, ease_fun).play();
    }
    static timeout(callback, delay) {
        return new jTimeline().callback(callback, delay).play();
    }
    static temp(progress, from) {
        let val = from || 0;
        return {
            val: function (v) {
                if (!arguments.length) return val;
                progress(v);
                val = v;
            }
        };
    }
    static playSpace(fps) { return new PlaySpace(fps); }

    //默认play
    static defaultSpace = new PlaySpace();
}

//匀速函数
jTimeline.linear.easeNone = v => v;

//默认动效
jTimeline.defaultEase = jTimeline.linear.easeOut;