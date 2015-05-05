var util = require("util")
var _ = require("underscore")
var Promise = require("bluebird")
var MongoDB = Promise.promisifyAll(require('mongodb'))
var questions = require("./questions.json").questions
var onboarding = require("./onboarding.json").onboarding
var recomendation = require("./recomendation.json").recomendation
var dotty = require("dotty")
var bluemix = require('../config/bluemix')
var watson = require('watson-developer-cloud')
var extend = require('util')._extend;
var sendText = require("../send-text")

if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
  var mongo = env['mongodb-2.4'][0].credentials;
} else {
   var mongo = "mongodb://localhost:27017/wsms"
}

function sentences(personality){
  var mapped = _.map(personality.children, function(metric){
    return _.map(metric.children, function(dataSet){
      return {
        "name": dataSet.name,
        "percentage": dataSet.percentage,
        "parent": metric.id
      }
    })
  })
  console.log(mapped)
  var sentence = ["Each of the following traits is a piece of your personality profile:"]
  _.each(mapped, function(obj){
    console.log(obj)
    var ex = util.format("Within %s your %s is %s.", obj.parent, obj.name, (parseInt(obj.percent,10)*100).toString())
    sentence.push(ex)
  })
  return sentences
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
        pending_intro: 0,
        pending_recomendation: 0,
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
          "pending_onboarding":user.pending_onboarding,
          "pending_intro":user.pending_intro,
          "pending_recomendation":user.pending_recomendation,
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

var getInsightsAsync = Promise.promisify(personalityInsights.profile, personalityInsights)

function promptEngine(db, phoneNumber, txtMessage){

  return userFindOrCreate(db, phoneNumber).then(function(user){

    return insertMessage(db, txtMessage).then(function(){
      if(txtMessage.toLowerCase() !== "reset") return false
      return db.collection('users').updateAsync({
        phone_number: phoneNumber
      }, {
        $set:{
          pending_question: 0,
          pending_onboarding: 0,
          pending_intro: 0,
          pending_recomendation: 0,
          personality_text: []
        }
      }).then(function(){
        return "Reset complete!"
      })
    }).then(function(response){
      if(response) return response
      if(user.pending_question >= 11) return "All Done!"
      return false
    }).then(function(response){
      if(response) return response
      if(user.pending_onboarding == 0){
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
      if(response) return response
      return Promise.all([
        incrementPending(db, phoneNumber, "pending_question"),
        pushNewPersonalityString(db, user, txtMessage),
      ]).then(function(){
        var nextObjStr = user.pending_question+".a"
        var questionExists = dotty.exists(questions, nextObjStr)
        var question = dotty.get(questions, nextObjStr)
        if(questionExists) return question
        return false
      })
    }).then(function(response){
      if(response) return response
      return Promise.all([
        incrementPending(db, phoneNumber, "pending_intro"),
      ]).then(function(){
        if(user.pending_intro == 0 && !parseTxt(txtMessage)){
          return "Now we're going to ask some general questions, answer freely."
        }else{
          return false
        }
      })
    }).then(function(response){
      if(response) return response
      return Promise.all([
        incrementPending(db, phoneNumber, "pending_recomendation"),
      ]).then(function(){
        var nextObjStr = user.pending_recomendation
        var questionExists = dotty.exists(recomendation, nextObjStr)
        var question = dotty.get(recomendation, nextObjStr)
        if(questionExists) return question
        return false
      })
    }).then(function(response){
      if(response == "All Done!"){
        db.collection("users").findOneAsync({"phone_number": phoneNumber}).then(function(user){
          var personalityText = user.personality_text.join(" ")
          return getInsightsAsync({"text": personalityText}).then(function(personalityObject){
            return db.collection("users").updateAsync(
              {
                "phone_number": phoneNumber
              }, {
              "$set": {
                "personality": personalityObject[0].tree
              }
            }).then(function(){
              var personalitySentences = sentences(personalityObject[0].tree)
              return Promise.map(personalitySentences, function(sentence){
                return sendText(phoneNumber, sentence)
              })
            })
          })
        })
      }
      if(response) return response
      return "All done!"
    })
  })
}


module.exports = promptEngine
