import jTimeline from "../src/jTimeline";

var img1 = document.getElementById("i1");
var player = new jTimeline()
    .to(img1, 2, { width: 300, height: 400 })
    .addTimeline(new jTimeline().to(img1, 2, { width: 100 }).callback(function () { console.log("test"); }), 1, 0.5, 1)
    .to(img1, 2, { width: 200, height: 200 })
    .callback(function () {
        console.log("end");
    })
    .play({
        reverse: 3,
        repeat: 0,
        wait: 1,
        scale: 2
    });

player.on("times", function (t) {
    console.log(t);
});