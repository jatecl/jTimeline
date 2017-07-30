# jTimeline
一个简单的动画驱动

## jTimeline()
返回一个时间线编辑对象，主要包含如下方法: 

fromTo: 从一个状态动画到另一个状态

	target: 做动画的对象

	duration: 动画持续时间

	from: 开始状态

	to: 结束状态

	delay: 延时。不传入这个参数的时候，表示延时为当前时间线长度。传入函数时会被认为作为ease的值

	ease: 缓动效果，是一个函数，对输入区间为0~1的数字做变换



from: 从指定状态开始，到当前时间线的状态。比fromTo少一个to参数



to: 从当前时间线状态开始，到指定的状态。比fromTo少一个from参数



addTimeline: 添加另一条时间线的只读拷贝。

		line: 要添加的时间线

		delay: 延时。不传入这个参数的时候，表示延时为当前时间线长度。传入函数时会被认为作为ease的值

		scale: 时间线缩放，默认为1

		reverse: 反向。默认为0。

* 注意：在添加的时间线未指定开始状态时（比如只用了一个from函数或者to函数），可能会产生一些意料外的情况，因为会被当前时间线的状态影响。



duration: 时间线长度



callback: 在时间线里面插入函数调用。
	
	callback: 回调函数

	delay: 延时。不传入这个参数的时候，表示延时为当前时间线长度。



play: 播放已编辑的时间线，并返回Player对象

	config.delay: 延时。默认为0

	config.wait: 播放结束后等待时长。默认为0

	config.scale: 播放速度比例。默认为1

	config.reverse: 播放方向。默认为0，正向播放。
	
		其他值: 1、反向播放；2、正向反向交替，从正向开始；3、正向反向交替，从反向开始。
		
		当reverse大于1时，repeat设置为2或以上才会生效

	config.repeat: 播放次数。默认为1，小于等于0时，会无限循环播放

	config.keepBeforeDelay: 在播放到指定的属性之前，保持当前状态。默认为false



## Player
在调用时间线play方法时得到

play: 开始播放。默认已被调用

pause: 暂停播放

reset: 重置播放状态。

kill: 结束播放。kill被调用后，将不能再次调用play方法。对象将处于无效状态

process: 正向的播放进度，范围为0到1。传入参数将设置播放进度。

Player有如下事件可以使用
	
	play: 调用play方法时触发

	pause: 调用pause方法时触发

	reset: 调用reset方法时触发

	kill: 播放器被kill时触发

	process: 播放进度变化时触发

	times: 进入下一个循环时触发。会给回调传入当前循环数


```javascript
var $div = $("#div");
var player = jTimeline().from($div, 0.5, { left: 30 })
	.to($div, 0.5, { top: 50 })
	.callback(function(){
		alert("end");
	})
	.play();
player.on("times", function(t){
	console.log(t);
});
player.process(0.5);
```

## 其他方法和属性

jTimeline.from: 将调用jTimeline().from并play

jTimeline.to: 将调用jTimeline().to并play

jTimeline.fromTo: 将调用jTimeline().fromTo并play

jTimeline.ease: 预置的缓动效果

jTimeline.defaultEase: 默认缓动效果。重写可改变全局行为

jTimeline.requestAnimationFrame: 多媒体定时器。重写这个函数，可以让jTimeline运行在cocos2x-js等其他非浏览器平台上

jTimeline.clearAnimationFrame: 清除多媒体定时器。应该和requestAnimationFrame同时被重写

jTimeline.access: 重写这个函数，可以支持更多的对象。示例见src/jTimelineCss.js

jTimeline.isArray: 重写这个函数，可以对自定义的列表对象做处理。示例见src/jTimelineCss.js

jTimeline.playSpace: 对动画进行分组，可以实现暂停、播放等动作
