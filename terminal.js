var _ = require("underscore")
var Promise = require("bluebird")
var MongoDB = Promise.promisifyAll(require('mongodb'))
var prompt = Promise.promisifyAll(require("prompt"))
var promptEngine = require("./prompt-engine")

function recursive(db, phoneNumber, txtMessage){
  return promptEngine(db, phoneNumber, txtMessage).then(function(response){
    return prompt.getAsync([response]).then(function(result){
      var txtMessage = _.values(result)[0]
      return recursive(db, phoneNumber, txtMessage)
    })
  })
}

return MongoDB.connectAsync("mongodb://localhost:27017/wsms").then(function(db){
  return prompt.getAsync(["What's your phone number?"]).then(function(result){
    var phoneNumber = _.values(result)[0]
    return recursive(db, phoneNumber, "Hello")
  })
})
