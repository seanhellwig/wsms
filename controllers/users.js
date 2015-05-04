'use strict';

var User = require('../models/user');

exports.questionnaire = function(req, res){
  var from = req.body.From; 
  User.questionnaire(req, function(err, returnMessage){
  	sendText(from, returnMessage, cb);
  })
};

//send text function
function sendText(to, body, cb){
  var accountSid = process.env.TWSID,
      authToken = process.env.TWTOK,
      from = process.env.FROM,
      client = require('twilio')(accountSid, authToken);

  client.messages.create({to: to, from: from, body: body}, cb);
}