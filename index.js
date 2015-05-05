var Promise = require('bluebird');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cfenv = require('cfenv');

var promptEngine = require('./prompt-engine');

var appEnv = cfenv.getAppEnv();
var mongo = Promise.promisifyAll(require('mongodb'));
var twilio = require('twilio');
var twilio_client = new twilio.RestClient(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
var twilio_post = Promise.promisify(twilio_client.sms.messages.post);
var server;
var mongoUrl = 'mongodb://localhost:27017/wsms';
var services = appEnv.services;
var database;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

if (services['mongodb-2.4']) {
	mongoUrl = services['mongodb-2.4'][0].credentials.url;
}

// mongo.connect(mongoUrl, function(err, db) {
//   db = db;
// });

//var questionAnswered = prompt_engine.questionAnswered
//var askQuestion = prompt_engine.askQuestion

mongo.connectAsync(mongoUrl).then(function(db){

  app.post('/receive', function(req, res) {

  	var phoneNumber = req.body.From // user
  	var txtMessage = req.body.Body

		return promptEngine(db, phoneNumber, txtMessage).then(function(response){
      return twilio_post({
          to: phoneNumber,
          from: '+18459432793',
          body: response
        }).then(function(message) {
          console.log('Success sent');
          console.log(message);
        });
		})

		/*
    return questionAnswered(db, phoneNumber, answer).then(function(response){
      console.log(response)
      if(!response) return false;
      return askAndAnswer(phoneNumber, db)
    })

    return prompt_engine.askQuestion(db, user).then(function(question) {
      console.log(question);
      return twilio_post({
          to: user,
          from: '+18459432793',
          body: question
        }).then(function(message) {
            console.log('Success sent');
            console.log(message);
        });
    }).catch(function(e) {
      console.log(e.message);
    });
		*/

  });


// // Test route
// app.get('/send', function(req, res) {
//
// });


  console.log('Mongo connected');
  database = db
  server = app.listen(appEnv.port || 3000, appEnv.bind || 'localhost', function() {
    console.log('Up and running!');
  });
});
