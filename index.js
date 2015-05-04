// var Promise = require('bluebird');
var express = require('express');
var app = express();
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var mongo = require('mongodb').MongoClient;
var twilio = require('twilio');
// var twilio_client = twilio.RestClient(appEnv.twilio_sid, appEnv.twilio_token);
var server;
var mongoUrl;
var services = appEnv.services;
var db;
   
// if (services['mongodb-2.4']) {
// 	mongoUrl = services['mongodb-2.4'].credentials.url;
// }

// mongo.connect(mongoUrl, function(err, db) {
//   db = db;
// });

app.post('/receive', function(req, res) {
	var user = req.body.From;
	var body = req.body.Body;
});

app.get('/send', function(req, res) {
  // twilio_client.messages.create({
  //   to:'',
  //   from:'TWILIO_NUMBER',
  //   body:'Hello World'
  // }, function(error, message) {
  //     if (error) {
  //         console.log(error.message);
  //     }
  // });
});

server = app.listen(appEnv.port || 3000, appEnv.bind || 'localhost', function() {
  console.log('Up and running!');
});