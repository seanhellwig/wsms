var express = require('express');
var mongo = require('mongodb');
var app = express();
var client = require('twilio')(accountSid, authToken);
var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3000);
var server;



app.get('/receive', function(req, resp) {

});


server = app.listen(port, host);