const http = require('http');
const fs = require('fs');
const ws=require('socket.io');

const server = http.createServer();

server.on('request',function(request,response){
		
		var url = request.url;
		if(url ==='/'){
			//response.writeHead(响应状态码，响应头对象): 发送一个响应头给请求。
			response.writeHead(200,{'Content-Type':'text/html'})
			// 如果url=‘/’ ,读取指定文件下的html文件，渲染到页面。
			fs.readFile('./index.html','utf-8',function(err,data){
				if(err){
					throw err ;
				}
				response.end(data);
			});
		}		
	});

server.listen(3000, '127.0.0.1', () => {
  console.log('服务器运行在 http:/127.0.0.1:3000/');
});

const websocket= http.createServer().listen(3030, '127.0.0.1');
var io=ws(websocket);
var all=[];
io.on('connection',function(socket){
	// console.log(all);
	io.to(socket.id).emit('message',all);
	socket.on('message',function(paint){
		all.push(paint);
		io.emit('message',paint);
	})
})