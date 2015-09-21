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



callback: 在时间线里面插入函数调用。
	
	callback: 回调函数

	delay: 延时。不传入这个参数的时候，表示延时为当前时间线长度。



play: 播放已编辑的时间线，并返回Player对象

	config.delay: 延时。默认为0

	config.wait: 播放结束后等待时长。默认为0

	config.scale: 播放速度比例。默认为1

	config.reverse: 播放方向。默认为0

	config.repeat: 播放次数。默认为1，小于等于0时，会无限循环播放

	config.keepBeforeDelay: 在播放到指定的属性之前，保持当前状态。默认为false



## Player
在调用时间线play方法时得到

play: 开始播放。默认已被调用

pause: 暂停播放

reset: 重置播放状态。

kill: 结束播放。kill被调用后，将不能再次调用play方法。对象将处于无效状态

process: 播放进度，范围为0到1。传入参数将设置播放进度


```javascript
var $div = $("#div");
var player = jTimeline().from($div, 0.5, { left: 30 })
	.to($div, 0.5, { top: 50 })
	.callback(function(){
		alert("end");
	})
	.play();
player.process(0.5);
```

## 其他方法和属性

jTimeline.from：将调用jTimeline().from并play

jTimeline.to：将调用jTimeline().to并play

jTimeline.fromTo：将调用jTimeline().fromTo并play

jTimeline.ease：预置的缓动效果