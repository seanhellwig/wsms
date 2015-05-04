// var Promise = require('bluebird');
var express = require('express');
var app = express();
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var mongo = require('mongodb').MongoClient;
var twilio = require('twilio');
var twilio_client = new twilio.RestClient(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
var server;
var mongoUrl;
var services = appEnv.services;
var db;

if (services['mongodb-2.4']) {
	mongoUrl = services['mongodb-2.4'][0].credentials.url;
}

mongo.connect(mongoUrl, function(err, db) {
  db = db;
});

app.post('/receive', function(req, res) {
	var user = req.body.From;
	var body = req.body.Body;
});


// // Test route
// app.get('/send', function(req, res) {
//   twilio_client.sms.messages.post({
//     to:'',
//     from:'',
//     body:'Hello World'
//   }, function(error, message) {
//       if (error) {
//           console.log(error.message);
//       }
//   });
// });

server = app.listen(appEnv.port || 3000, appEnv.bind || 'localhost', function() {
  console.log('Up and running!');
});