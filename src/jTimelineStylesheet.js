//这是一个非常简单的实现，没有分解transform，就当作一个demo吧
(function () {
    var old_access = jTimeline.access;
    var units_mini = {
        px: "left,top,right,bottom,width,height,fontSize"
    };
    var units = {};
    for (var k in units_mini) {
        var ps = units_mini[k].split(",");
        for (var i = 0; i < ps.length; ++i) units[ps[i]] = k;
    }
    jTimeline.access = function (obj, key) {
        if (obj && !(key in obj)) return function (val) {
            if (arguments.length) {
                if (key in units) val += units[key];
                if (window.jMove) jMove.css(obj, key, val);
                else if (obj.css) obj.css(key, val);
                if (obj.style) {
                    if (obj.style.setProperty) obj.style.setProperty(key, val);
                    else obj.style[key] = val;
                }
            }
            else {
                if (obj.style) {
                    if (obj.style.getProperty) return parseFloat(obj.style.getProperty(key)) || 0;
                    return parseFloat(obj.style[key]) || 0;
                }
                return 0;
            }
        };
        return old_access.call(this, obj, key);
    };
    var old_isArray = jTimeline.isArray;
    jTimeline.isArray = function (o) {
        if (window.$ && $ == o.constructor) return true;
        return old_isArray.call(this, o)
    };
})();