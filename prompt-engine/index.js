var _ = require("underscore")
var Promise = require("bluebird")
var MongoDB = Promise.promisifyAll(require('mongodb'))
var prompt = Promise.promisifyAll(require("prompt"))
var questions = require("./questions.json").questions
var onboarding = require("./onboarding.json").onboarding
var dotty = require("dotty")
var bluemix = require('../config/bluemix')
var watson = require('watson-developer-cloud')
var    extend = require('util')._extend;


if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
  var mongo = env['mongodb-2.4'][0].credentials;
} else {
   var mongo = "mongodb://localhost:27017/wsms"
}

// if bluemix credentials exists, then override local
var credentials = extend({
    version: 'v2',
    url: '<url>',
    username: '<username>',
    password: '<password>'
}, bluemix.getServiceCreds('personality_insights')); // VCAP_SERVICES

// initiate personality insights
var personalityInsights = new watson.personality_insights(credentials);

function fallbackDB(db){
  if(db){
    return new Promise(function(resolve){
      return resolve(db)
    })
  }else{

  }
}

function parseTxt(answer){
  answer = answer.toLowerCase()
  answer = answer.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
  var trutyOptions = ["true", "tru", "tr", "t", "yes", "ye", "y", "go", "g", "continue", "1", "okay", "ok", "k", "good"]
  if(_.contains(trutyOptions, answer)) return true
  return false
}

function attributeText(questionId, answer){
  answer = parseTxt(answer)
  var questionObj = questions[questionId]
  if(answer) return questionObj["a"]
  return questionObj["b"]
}

function userFindOrCreate(db, phoneNumber){
  return db.collection("users").findAndModifyAsync({
      phone_number: phoneNumber
    },
    {
      _id: -1
    },
    {
      $setOnInsert: {
        phone_number: phoneNumber,
        pending_question: 0,
        pending_onboarding: 0,
        messages: [],
        personality_text: []
      }
    },
    {
      new: true, // return new doc if one is upserted
      upsert: true // insert the document if it does not exist
    }).then(function(user){
      return user.value
    })
}

// send text message
function nextQuestion(db, phoneNumber){
  return userFindOrCreate(db, phoneNumber).then(function(user){
    var nextObjStr = "["+user.pending_question+"]['a']"
    if(dotty.exists(questions, nextObjStr)) return dotty.get(questions, nextObjStr)
    return false
  })
}

function insertMessage(db, user, txtMessage){
  return db.collection("users").updateAsync({
      phone_number: user.phone_number
    },
    {
      $push:{
        messages: {
          "pending_question":user.pending_question,
          "pending_onboarding":user.pending_question,
          "txtMessage": txtMessage
        }
      }
    })
}

function incrementPending(db, phoneNumber, pending){
  var update = {}
  update["$inc"] = {}
  update["$inc"][pending] = 1
  return db.collection("users").updateAsync({
    phone_number: phoneNumber
  }, update)
}

function updateUser(db, user, txtMessage){
  return db.collection("users").updateAsync({
      phone_number: user.phone_number
    },
    {
      $push:{
        responses: {
          "id": user.pending_question,
          "answer": questionAnswer,
        },
        personality_text: attributeText(user.pending_question, txtMessage)
      },
      $set:{
        pending_question: user.pending_question++
      }
    })
}

function pushNewPersonalityString(db, user, txtMessage){
  return db.collection("users").updateAsync({
      phone_number: user.phone_number
    },
    {
      $push:{
        personality_text: attributeText(user.pending_question, txtMessage)
      }
    })
}

function recursive(db, phoneNumber, txtMessage){
  return promptEngine(db, phoneNumber, txtMessage).then(function(response){
    return prompt.getAsync([response]).then(function(result){
      var txtMessage = _.values(result)[0]
      return recursive(db, phoneNumber, txtMessage)
    })
  })
}

function terminal(){
  return MongoDB.connectAsync(mongo).then(function(db){
    return prompt.getAsync(["What's your phone number?"]).then(function(result){
      var phoneNumber = _.values(result)[0]
      return recursive(db, phoneNumber, "Hello")
    })
  })
}

function getInsights(text, cb){
  personalityInsights.profile({
    "personality": text
  }, function(err, profile) {
    if (err) {
      if (err.message){
        err = { error: err.message };
        console.log('error in getInsights function', err);
      }
      cb ('error');
    }
    else
      cb(profile);
  });
}

var getInsightsAsync = Promise.promisify(getInsights)

function promptEngine(db, phoneNumber, txtMessage){
  return userFindOrCreate(db, phoneNumber).then(function(user){
    console.log(user)
    if(user.pending_question >= 11) return false
    return insertMessage(db, txtMessage).then(function(){
      //console.log(parseTxt(txtMessage))
      if(txtMessage == "reset"){
        return db.collection('users').updateAsync({phone_number: phoneNumber}, {
          $set:{
            pending_question: 0,
            pending_onboarding: 0,
            personality_text: []
          }
        }).then(function(){
          return "Reset complete"
        })
      }else if(user.pending_onboarding == 0){
        // user has been inserted if pending_onboarding is 0 incrent it
        // return the onboarding string
        return incrementPending(db, phoneNumber, "pending_onboarding").then(function(){
          // ask first onboarding question
          return onboarding[0]
        })
      }else if(user.pending_onboarding == 1 && parseTxt(txtMessage)){
        // first question has been asked
        // we need the response to be "true" so we check the txtMessage
        return incrementPending(db, phoneNumber, "pending_onboarding").then(function(){
          // ask second onboarding question
          return onboarding[1]
        })
      }else if(user.pending_onboarding == 1 && !parseTxt(txtMessage)){
        return "Try again. " + onboarding[0]
      }else if(user.pending_onboarding == 2 && parseTxt(txtMessage)){
        // first question has been asked
        // we need the response to be "true" so we check the txtMessage
        return incrementPending(db, phoneNumber, "pending_onboarding").then(function(){
          return false
        })
      }else if(user.pending_onboarding == 2 && !parseTxt(txtMessage)){
        return "Try again. " + onboarding[1]
      }else{
        return false
      }
    }).then(function(response){
      // if false then we're done with oboarding
      //console.log(response)
      if(response) return response
      return Promise.all([
        incrementPending(db, phoneNumber, "pending_question"),
        pushNewPersonalityString(db, user, txtMessage),
      ]).then(function(){
        var nextObjStr = user.pending_question+".a"
        var questionExists = dotty.exists(questions, nextObjStr)
        var question = dotty.get(questions, nextObjStr)
        //console.log(questionExists)
        //console.log(question)
        if(questionExists) return question
        return false
      })
    }).then(function(){
      if(response) return response
      db.collection("users").findOneAsync({"phone_number": phoneNumber}).then(function(user){
        var personalityText = user.personality_text.join(" ")
        return getInsightsAsync(personalityText).then(function(personalityObject){
          return db.collection("users").update({"phone_number": phoneNumber}, {
            "$set": {
              "personality": personalityObject
            }
          })
        })
      })
      return "All done!"
    })
  })
}


module.exports = promptEngine
