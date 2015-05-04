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
//users controller init
var users  = require('controllers/users');
   
if (services['mongodb-2.4']) {
	mongoUrl = services['mongodb-2.4'][0].credentials.url;
}

mongo.connect(mongoUrl, function(err, db) {
  db = db;
});

// daniel-dev route to user.questionnaire 
app.post('/receive', users.questionnaire);

// app.post('/receive', function(req, res) {
// 	var user = req.body.From;
// 	var body = req.body.Body;
// });


// Test route
// app.get('/send', function(req, res) {
//   twilio_client.messages.create({
//     to:'+13104093364',
//     from:'TWILIO_NUMBER',
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