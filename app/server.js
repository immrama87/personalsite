var express = require("express");
var app = express();
var web = express();


var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(__dirname + "/admin"));
require("./admin")(app);

var appServer = app.listen(3333, function(){
	console.log("Started application server on port 3333");
});

web.use("/*", require("extl")(__dirname + "../web"));

var webServer = web.listen(80, function(){
	console.log("Started web server on port 80");
});