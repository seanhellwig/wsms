'use strict';

var Mongo = require('mongodb');

// require watson developer cloud
var watson = require('watson-developer-cloud');

// Create the service wrapper
var personalityInsights = new watson.personality_insights(credentials);

// if bluemix credentials exists, then override local
 credentials = extend({
    version: 'v2',
    url: '<url>',
    username: '<username>',
    password: '<password>'
}, bluemix.getServiceCreds('personality_insights')); // VCAP_SERVICES


// create user
function User(){
}

//create user collection
Object.defineProperty(User, 'collection', {
	get: function(){ return global.mongodb.collection('users');}
});

User.questionnaire = function(o, cb){

	//find if user exists already
	User.collection.findOne({number: o.body.From}, function(err, user){
		//if user exists return empty call back or a message
		if(user){
			//check the contents of the message received
			messageContentsCheck(o, function(){

			});

		}
		//if user does not exist save the user's phone number
		User.collection.save(o.body.From, cb);
	});
};


//private functions 

//check what the contents of the message received are and enact correct function 
function messageContentsCheck(o, cb){
	var receivedMessage = o.body.Body.toLowerCase();
	if(receivedMessage === 'yes' || receivedMessage ==='y' || receivedMessage === 'true' || receivedMessage === 't'){
		receivedMessage = 'yes';
	} else if(receivedMessage === 'no' || receivedMessage ==='n' || receivedMessage === 'false' || receivedMessage === 'f')
		receivedMessage = 'no';
	} else if(receivedMessage === 'go' || receivedMessage === 'g'){
		receivedMessage = 'go';
	} else {
		receivedMessage = 'invalid';
	}


	switch(receivedMessage){
		case 'yes':
		//function for yes
		break;
		case 'no':
		break;
		case 'go':
		break
		case 'invalid':

	}
}


//personality insights call 
function insights(userFinalContent, res){
	personalityInsights.profile(userFinalContent, function(err, profile) {
    if(err){
      if (err.message){
        err = { error: err.message };
      }
      return 'Error processing the request';
    }
    else
      return res.json(profile);
  });
}


