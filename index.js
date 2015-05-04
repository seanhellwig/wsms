var express = require('express');
var mongo = require('mongodb');
var app = express();
var twilio_client = require('twilio')(process.env.twilio_sid, process.env.twilio_token);
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var server;

app.get('/receive', function(req, resp) {
	console.log('/receive hit');
});


server = app.listen(appEnv.port || 3000, appEnv.bind || 'localhost', function() {
	console.log('Up and running!');
});