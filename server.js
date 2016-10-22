var http = require('http');
var fs = require('fs');

var server = http.createServer(function(req, res){
  res.writeHead(200);
  res.end("Hello hackGSU!");
}).listen(8000);
