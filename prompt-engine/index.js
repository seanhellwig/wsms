var _ = require("underscore")
var Promise = require("bluebird")
var MongoDB = Promise.promisifyAll(require('mongodb'))
var questions = require("./questions.json")

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

function parseAnswer(answer){
  var answer = answer.toLowerCase()
  var answerTrue = ["true", "tru", "tr", "t", "yes", "ye", "y"]
  if(_.contains(answer, answerTrue)) return true
  return false
}

function attributeText(questionId, answer){
  answer = parseAnswer(answer)
  var questionObj = questions.questions[questionId]
  if(answer) return questionObj["a"]
  return questionObj["b"]
}

// send text message
function askQuestion(db, phoneNumber){
  return fallbackDB(db).then(function(db){
    var users = db.collection("users")
    return users.findAndModifyAsync(
      {
        phone_number: phoneNumber
      },
      {
        _id: -1
      },
      {
        $setOnInsert: {
          phone_number: phoneNumber,
          questions_asked: [],
          pending_answer: 0,
          q_and_a: [],
          sheet: []
        }
      },
      {
        new: true, // return new doc if one is upserted
        upsert: true // insert the document if it does not exist
      }
    ).then(function(user){
      console.log(user)
      var pendingAnswer = user.value.pending_answer
      if(pendingAnswer == 11) return false
      var nextQuestionObj = questions.questions[pendingAnswer]
      return nextQuestionObj["a"]
    })
  })
}

// on text recieved
function questionAnswered(db, phoneNumber, questionAnswer){
    return fallbackDB(db).then(function(db){
      var users = db.collection("users")
      return users.findOneAsync({
        phone_number: phoneNumber
      }).then(function(user){
        console.log(user)
        return users.updateAsync(
          {
            phone_number: phoneNumber
          },
          {
            $push:{
              q_and_a : {
                "questionId": user.pending_answer,
                "questionAnswer": questionAnswer,
              },
              sheet: attributeText(user.pending_answer, questionAnswer)
            },
            $set:{
              pending_answer: user.pending_answer+1
            }
          }
        ).then(function(user){
          return true
        })
      })
    })
}

module.exports = {
  "askQuestion": askQuestion,
  "questionAnswered": questionAnswered
}
