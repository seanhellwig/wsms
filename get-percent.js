var _ = require('underscore')
var personality = require("./personality")
var util = require("util")

function sentences(personality){
  var sentences =  _.map(personality.children, function(children){
    return _.map(children.children, function(deepChildren){
      return {
        "name": deepChildren.name,
        "percentage": deepChildren.percentage,
        "parent": children.id
      }
    })
  })
  sentences = _.flatten(sentences)
  sentences = _.map(sentences, function(sentence){
    var percent = Math.ceil(sentence.percentage*100)
    return util.format("Within %s your %s is %d%.", sentence.parent, sentence.name, percent)
  })
  sentences.unshift("Each of the following traits is a piece of your personality profile:")
  return sentences
}

var x = sentences(personality)
console.log(x)
