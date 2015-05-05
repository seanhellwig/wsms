var _ = require('underscore')
var personality = require("./personality")

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

/*
  var sentence = ["Each of the following traits is a piece of your personality profile:"]
  _.each(mapped, function(obj){
    console.log(obj)
    var ex = util.format("Within %s your %s is %s.", obj.parent, obj.name, (parseInt(obj.percent,10)*100).toString())
    sentence.push(ex)
  })
  return sentences
*/
}

//console.log(sentences(personality)[0])
