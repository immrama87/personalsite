var express = require("express");
var app = express();
var web = express();

var extl = require("extl")();

var appServer = app.listen(3000, function(){
	console.log("Started application server on port 3000");
});

web.use("/*.*", express.static(__dirname + "../web"));
web.use("/*", require("extl")(__dirname + "../web"));

var webServer = web.listen(80, function(){
	console.log("Started web server on port 80");
});