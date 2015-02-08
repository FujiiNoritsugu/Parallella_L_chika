//--------------------------------------------------------------------
// Webサーバとしてコネクションを張る
var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);

var fs = require('fs');
var html = fs.readFileSync('parallella_L_chika.html', 'utf8');

app.listen(8124);

function handler(req, res){
 res.setHeader('Content-Type', 'text/html');
 res.setHeader('Content-Length', Buffer.byteLength(html, 'utf8'));
 res.end(html);
}

//--------------------------------------------------------------------

var exec = require('child_process').exec;
var status = {red:false, yellow:false, blue:false};
var rule = 'point';
var target_socket;
var switch_status = 'off';
var switch_result = 0;

io.sockets.on('connection',onConnection);

function onConnection(socket){
try{
console.log("on connect");
	socket.on('message', onMessage);
	target_socket = socket;
	process();
}catch(e){
 console.log(e);
}
}

// 受信したメッセージをルールに設定する。
function onMessage(message){
	console.log("message = " + message);
	rule = message;
}

// 200ミリ秒毎にメモリの状態を確認し、
// SwitchがONであればルールに応じてステータスを変更後、
// LEDに反映しかつクライアントにステータスを送信する
function process(){
//console.log("in process");
try{
//console.log("switch_status = " + switch_status);
checkSwitch();
  if(switch_result === 1){
    // 前回offであれば処理を行う
    if(switch_status === 'off'){
     try{
      changeStatus();
      changeLED();
      target_socket.send(JSON.stringify(status));
     }catch(e){
      console.log(e);
     }
    }
    switch_status = 'on';
  }else{
    switch_status = 'off';
  }
  
  setTimeout(process, 200);
 }catch(e){
console.log(e);
 }
}

// ルールに応じてステータスを変更する
function changeStatus(){
    if(rule === 'point'){changeStatusForPoint();}
    if(rule === 'seq'){changeStatusForSeq();}
    if(rule === 'all'){changeStatusForAll();}
}

// 個別点灯用ステータスルール
function changeStatusForPoint(){
    if(status.blue === false && status.yellow === false && status.red === false){
     status.blue = true;
    } else if(status.blue === true && status.yellow === false && status.red === false){
     status.blue = false;
     status.yellow = true;
    } else if(status.blue === false && status.yellow === true && status.red === false){
     status.yellow = false;
     status.red = true;
    } else if(status.blue === false && status.yellow === false && status.red === true){
     status.blue = true;
     status.red = false;
    } else {
     status.blue = false;
     status.yellow = false;
     status.red = false;
    }
}

// 順次点灯用ステータスルール
function changeStatusForSeq(){
    if(status.blue === false && status.yellow === false && status.red === false){
     status.blue = true;
    } else if(status.blue === true && status.yellow === false && status.red === false){
     status.yellow = true;
    } else if(status.blue === true && status.yellow === true && status.red === false){
     status.red = true;
    } else if(status.blue === true && status.yellow === true && status.red === true){
     status.red = false;
     status.yellow = false;
     status.blue = false;
    } else {
     status.red = false;
     status.yellow = false;
     status.blue = false;
    }
}

// 全点灯用ステータスルール
function changeStatusForAll(){
    if(status.blue === false && status.yellow === false && status.red === false){
     status.blue = true;
     status.yellow = true;
     status.red = true;
    } else {
     status.blue = false;
     status.yellow = false;
     status.red = false;
    }
}

// ステータスに応じてLEDを光らせる
function changeLED(){
console.log("status = " + JSON.stringify(status));
   var redValue = 0;
   var yellowValue = 0;
   var blueValue = 0;
   if(status.red)redValue = 1;
   if(status.yellow)yellowValue = 1;
   if(status.blue)blueValue = 1;
   exec('devmem2 0x60000004 byte '+ redValue, function(err, stdout, stderr){});
   exec('devmem2 0x6000000c byte '+ yellowValue, function(err, stdout, stderr){});
   exec('devmem2 0x60000008 byte '+ blueValue, function(err, stdout, stderr){});
}

// スイッチの状態を確認する
function checkSwitch(){
 
 var child = exec('devmem2 0x60000000 byte', function(err, stdout, stderr){
  if(!err){
   try{
     switch_result = parseInt(stdout.split(':')[1]);
   }catch(e){
     console.log(e);
   }
  }else{
     console.log(stderr);
  }
 });
 
}
