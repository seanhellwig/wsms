var index = require("./index")
var askQuestion = index.askQuestion
var questionAnswered = index.questionAnswered
var _ = require("underscore")
var prompt = require('prompt');
prompt.start();

var Promise = require("bluebird")
var MongoDB = Promise.promisifyAll(require('mongodb'))

if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
  var mongo = env['mongodb-2.4'][0].credentials;
} else {
   var mongo = "mongodb://localhost:27017/wsms"
}

function fallbackDB(db){
  if(db){
    return new Promise(function(resolve){
      return resolve(db)
    })
  }else{
    return MongoDB.connectAsync(mongo).then(function(db){
      return db
    })
  }
}

function askAndAnswer(db, phoneNumber){
  return askQuestion(db, phoneNumber).then(function(question){
    console.log(question)
    if(!question) return false;
    prompt.get([question], function (err, result) {
      var answer = _.values(result)[0]
      return questionAnswered(db, phoneNumber, answer).then(function(response){
        console.log(response)
        if(!response) return false;
        return askAndAnswer(phoneNumber, db)
      })
    })
  })
}

return fallbackDB(false).then(function(db){
  prompt.get(["What's your phone number?"], function (err, result) {
    var phoneNumber = _.values(result)[0]
    return askAndAnswer(db, phoneNumber)
  });
})
