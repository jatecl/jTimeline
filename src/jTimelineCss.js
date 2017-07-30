//这是一个非常简单的实现，没有分解transform，就当作一个demo吧.
(function (require) {
    //依赖于jMove
    if (!window.jMove) var jMove;

    var units_mini = {};
    units_mini["px"] = "left,top,right,bottom,width,height,font-size,padding-top,x,y";
    var units = {};
    for (var k in units_mini) {
        var ps = units_mini[k].split(",");
        for (var i = 0; i < ps.length; ++i) units[ps[i]] = k;
    }
    var jmoveKeys = { x: 1, y: 1, o: 1, s: 1, translateX: 1, translateY: 1, translateZ: 1, skewX: 1, skewY: 1, scale: 1, scaleX: 1, scaleY: 1, rotate: 1 };

    var createSetter = function (obj, key) {
        return function (val) {
            var o = obj._jtimeline.style;
            if (!o) obj._jtimeline.style = o = {};

            if (arguments.length) {
                if (jmoveKeys[key]) {
                    o[key] = val;
                    jMove && jMove.css(obj, o);
                }
                else {
                    if ((typeof val === "number") && !isNaN(val)) {
                        if (key in units) val += units[key];
                        else if (key == "z-index" || key == "zIndex") val = Math.round(val);
                    }
                    if (obj.css) obj.css(key, val);
                    else if (jMove) jMove.css(obj, key, val);
                    else if (obj.style) obj.style[key] = val;
                }
            }
            else {
                if (jMove) val = jMove.css(obj, key);
                if (!val && window.$) val = $(obj).css(key);
                if (!val) {
                    var cur = window.getComputedStyle ? getComputedStyle(obj) : obj.currentStyle || obj.style;
                    if (cur) {
                        if (cur.getPropertyValue) val = cur.getPropertyValue(key);
                        val = obj.style[key];
                    }
                }
                if (!val) {
                    if (key in o) return parseFloat(o[key]) || 0;
                    return 0;
                }
                return parseFloat(val) || 0;
            }
        };
    };
    var key_map = { x: 1, y: 1, o: 1, s: 1 };
    jTimeline._accessList.unshift(function (obj, key) {
        if (obj && obj.style && key_map[key]) return createSetter(obj, key);
    });
    jTimeline._accessList.push(function (obj, key) {
        if (obj && obj.style && !(key in obj)) return createSetter(obj, key);
    });
    jTimeline._isArrayList.push(function (o) {
        if (window.$ && $ == o.constructor) return true;
    });
})();