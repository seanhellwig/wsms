var Promise = require("bluebird")
var twilio = require('twilio');
var twilio_client = new twilio.RestClient(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
var twilio_post = Promise.promisify(twilio_client.sms.messages.post);

function sendText(phoneNumber, txtMessage){
  return twilio_post({
    to: phoneNumber,
    from: '+18459432793',
    body: txtMessage
  })
}

module.exports = sendText
