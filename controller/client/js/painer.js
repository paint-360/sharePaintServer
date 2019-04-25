/**
 * Created by Administrator on 2017/8/10.
 * js/painer.js
 */
const eraserWidth=16;
function throttle(fn,delay,context){
	let prev=Date.now();
	return function(){
		let args=arguments;
		let current=Date.now();
		if(current-prev>delay){
			fn.apply(context,args);
			prev=current;
		}
	}
}
(function () {
    class Painter{
        constructor(id) {
            let canvasEle = document.getElementById(id);
            canvasEle.width = 900;
            canvasEle.height = 600;
            this.option=1;//记录操作类型 1为画笔 0为橡皮檫
            this.context = canvasEle.getContext("2d");
            this.optionStack=[];//操作记录栈
            this.resultposition=[];
            this.message={};
            // this.ws=this.initWebSocket();  
            this.isBegin=-1;//起始点
            //画笔渐变色
            let linearGradient = this.context.createLinearGradient(0,0,900,600);
            linearGradient.addColorStop(0,"#1EEB9F");
            linearGradient.addColorStop(0.5,"#FFFFFF");
            linearGradient.addColorStop(1,"#26B9EB");
            this.context.strokeStyle = linearGradient;
            this.initEvent();
            this.drawLine();
        }
        //事件注册中心
        initEvent(){
            this.startAction=startAction;
            this.endAction=endAction;
            this.moveAction=moveAction;
            this.mouseStart=mouseStart;
            this.mouseMove=mouseMove;
            this.mouseUp=mouseUp;
            let self=this;
            let sendMessageT=throttle(this.sendMessage,100,this);
             //封装鼠标按下函数
            function startAction(event) {
                //如果没有使用橡皮擦就画线
                if(!self.isClear){
                    //开始新的路径
                    self.context.beginPath();
                    self.context.moveTo(event.pageX,event.pageY);
                    self.context.stroke();
                }
                //监听鼠标移动
                self.context.canvas.addEventListener("mousemove",self.moveAction);
            }
            //封装鼠标抬起函数
            function endAction() {
                // console.log(this.resultposition)
                // console.log(DouglasPeucker.getProcessPoints(this.resultposition, 1))
                self.isBegin=0;
                let message={
                    option:self.option,
                    positions:Object.assign([],DouglasPeucker.getProcessPoints(self.resultposition, 1)),
                    lineWidth:self.lineWidth,
                    lineColor:self.context.strokeStyle,
                    isBegin:self.isBegin,
                    isEnd:1
                }
                //不再使用橡皮擦
                self.isClear=false;
                self.option=1;
                //移除鼠标移动事件
                self.context.canvas.removeEventListener("mousemove",self.moveAction);
                self.optionStack.push(message);
                self.resultposition=[];
                self.ws.send(message);
                self.isBegin=-1;
                //console.log(JSON.stringify(this.optionStack));
            }
            //封装鼠标移动函数
            function moveAction(event) {
                let item;
                
                //判断是否启动橡皮擦功能
                if(self.isClear){
                    self.context.clearRect(event.pageX-eraserWidth/2,event.pageY-eraserWidth/2,eraserWidth,eraserWidth);
                    item={x:event.pageX,y:event.pageY};
                    self.resultposition.push(item);
                    return;
                }
                item={x:event.pageX,y:event.pageY};
                self.resultposition.push(item);
                
                self.context.lineTo(event.pageX,event.pageY);
                self.context.stroke();
                sendMessageT();
            }
            function mouseStart(e){
                let startX=0,startY=0,id='rect';
                let evt = window.event || e;
                let div = document.createElement("div");
                startX = evt.pageX;
                startY = evt.pageY;
                div.id = id;
                div.className = "div";
                div.style.marginLeft = startX + "px";
                div.style.marginTop = startY + "px";
                document.body.appendChild(div);
                self.message.option=2;
                self.message.x1=evt.pageX;
                self.message.y1=evt.pageY;
                self.context.canvas.addEventListener("mousemove",self.mouseMove);
            }
            function mouseMove(e){
                let evt = window.event || e;
                let rectLeft,rectTop,rectHeight,rectWidth;
                let startX=self.message.x1,startY=self.message.y1;
                // var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
                // var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
                rectLeft = (startX - evt.pageX > 0 ? evt.pageX: startX) + "px";
                rectTop = (startY - evt.pageY> 0 ? evt.pageY: startY) + "px";
                rectHeight = Math.abs(startY - evt.pageY) + "px";
                rectWidth = Math.abs(startX - evt.pageX) + "px";
                document.querySelector('#rect').style.marginLeft = rectLeft;
                document.querySelector('#rect').style.marginTop = rectTop;
                document.querySelector('#rect').style.width = rectWidth;
                document.querySelector('#rect').style.height = rectHeight;
                
                
            }
            function mouseUp(e){
                console.log('mouseUp')
                document.querySelector('#rect').remove()
                let evt = window.event || e;
                self.message.x2=evt.pageX;
                self.message.y2=evt.pageY;
                self.message.lineWidth=self.lineWidth;
                self.message.lineColor=self.context.strokeStyle;
                self.ws.send(self.message);
                //恢复空对象
                self.message={};
                self.changeMode(2);
            }
        }
        initWebPainter(username,roomId){
            let ws=io.connect("ws://127.0.0.1:3000");
            //let ws = new WebSocket("ws://localhost:3000");
            let self=this;
            // ws.onopen = function(evt) { 
            //     console.log("Connection open ...");
            // };

            ws.on('message', function(data) {
                // console.log( "Received Message: " + evt.data);
                if(Array.isArray(data)){
                    self.initCanvas(data);
                }else{
                    self.optionStack.push(data);
                    self.update(data);
                }
            })

            // ws.onclose = function(evt) {
            //     console.log("Connection closed.");
            // }; 
            this.ws=ws;
            this.roomId=roomId;
        }
        drawRect(){
            this.changeMode(1);

            
        }
        sendMessage(){
            if(this.isBegin==-1){
                this.isBegin=1;
            }else{
                this.isBegin=0;
            }
            let message={
                option:this.option,
                positions:Object.assign([],DouglasPeucker.getProcessPoints(this.resultposition, 1)),
                lineWidth:this.lineWidth,
                lineColor:this.context.strokeStyle,
                isBegin:this.isBegin,
                isEnd:0
            }
            //console.log(this.resultposition)
            this.resultposition=[];
            this.ws.send(message);
        }
        changeMode(mode){
            switch(mode){
                case 1:
                    this.context.canvas.removeEventListener("mousedown",this.startAction);
                    this.context.canvas.removeEventListener("mousemove",this.moveAction);
                    this.context.canvas.removeEventListener("mouseup",this.endAction);
                    this.context.canvas.addEventListener("mousedown",this.mouseStart);
                    document.body.addEventListener("mouseup",this.mouseUp);
                    break;
                case 2://画笔模式
                    this.context.canvas.addEventListener("mousedown",this.startAction);
                    this.context.canvas.addEventListener("mouseup",this.endAction);
                    this.context.canvas.removeEventListener("mousedown",this.mouseStart);
                    this.context.canvas.removeEventListener("mousemove",this.mouseMove);
                    document.body.removeEventListener("mouseup",this.mouseUp);
                    break;
            }
        }
        drawLine() {
            //监听鼠标按下抬起
            this.context.canvas.addEventListener("mousedown",this.startAction);
            this.context.canvas.addEventListener("mouseup",this.endAction);
        }
        
        //更新画布内容
        update(message){
            let op=message.option;
            switch(op){
                //橡皮檫
                case 0:
                    message.positions.forEach(position=>{
                        this.context.clearRect(position.x-eraserWidth/2,position.y-eraserWidth/2,eraserWidth,eraserWidth);
                    })
                    break;
                case 1:
                //铅笔
                    if(message.isBegin){
                        this.context.beginPath();
                    }
                    message.positions.forEach(position=>{
                        this.context.lineTo(position.x,position.y);
                        this.context.stroke();
                    })
                    break;
                //清屏
                case 3:
                    this.context.clearRect(0,0,900,600);
                    break;
            }
        }
        //初始化画布
        initCanvas(data){
            this.optionStack=data;
            this.optionStack.forEach(op=>{
                this.update(op);
            })
        }
        //封装画笔宽度
        setLineWidth(width) {
            this.context.lineWidth = width;
        }
        //封装设置画笔样式
        isRoundLineCap(isRound) {
            this.context.lineCap = isRound?"round":"butt";
        }
        //封装画笔颜色
        setLineColor(color) {
            this.context.strokeStyle = color;
        }
        //封装画布内容转换
        save(){
            return this.context.canvas.toDataURL();
        }
        //封装橡皮擦
        eraser(){
            this.option=0;
            this.isClear=true;
        }
        //封装清屏
        clearCls(){
            let message={
                option:3,
                positions:[],
                lineWidth:0,
                lineColor:'',
                isBegin:1,
                isEnd:1
            }
            this.optionStack=[];
            this.context.clearRect(0,0,900,600);
            this.ws.send(message);
        }
    }   
    //Painter定义到window上
    window.Painter = Painter;
})();