var Promise = require('bluebird');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cfenv = require('cfenv');
var promptEngine = require('./prompt-engine');
var sendText = require("./send-text")
var appEnv = cfenv.getAppEnv();
var mongo = Promise.promisifyAll(require('mongodb'));
var mongoUrl = 'mongodb://localhost:27017/wsms';
var services = appEnv.services;

var server;
var database;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

// mongo.connect(mongoUrl, function(err, db) {
//   db = db;
// });

//var questionAnswered = prompt_engine.questionAnswered
//var askQuestion = prompt_engine.askQuestion

//console.log(services.mongolab[0].credentials.uri) works!

mongo.connectAsync(services.mongolab[0].credentials.uri).then(function(db){

	console.log('Mongo connected');

  app.post('/receive', function(req, res) {

		console.log('Recieved Text');

  	var phoneNumber = req.body.From
  	var txtMessage = req.body.Body

		console.log(phoneNumber)
		console.log(txtMessage)

		return promptEngine(db, phoneNumber, txtMessage).then(function(response){
			return sendText(phoneNumber, response).then(function(){
				return res.send("ok")
			})
		}).catch(function(e){
			console.log(e.message)
			throw e
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

  server = app.listen(appEnv.port || 3000, appEnv.bind || 'localhost', function() {
    console.log('Up and running!');
  });
});
