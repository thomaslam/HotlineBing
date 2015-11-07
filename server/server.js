var express = require('express');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var request = require('request');

var config = require('./config.js');
var mongoose = require('mongoose');

var twilio = require('twilio');

var TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
    TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
    TWILIO_NUMBER = config.TWILIO_NUMBER;

var TwilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var TwimlResp = new twilio.TwimlResponse();


var app = express();

app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, '../public')));

var respOption = {
  root: __dirname + '/../views/'
}

var responseWithHTML = function(res, fileName) {
  res.sendFile(fileName, respOption, function (err) {
    if (err) {
      console.log(err);
      res.status(err.status).end();
    }
    else {
      console.log('Sent:', fileName);
    }
  });
}

var TwilioMessage = function(res, phone, message) {
  TwilioClient.messages.create({
    to: phone,
    from: TWILIO_NUMBER,
    body: message
  }, function(err, data) {
    // res.send('Message is inbound!');
  });
}

app.post('/texts', function(req, res) {
  var note = req.body.Body;
  var phoneToMssg = req.body.From;
  console.log(note);
  console.log('Number is ' + req.body.From);

  TwilioMessage(res, phoneToMssg, "Hello from Twilio");
})

app.post('/calls', function(req, res) {
  console.log(req);
});

TwilioClient.calls('CA5eb3bb87eff9ad46de801ac0fc302d78').get(function(err, call) { 
  console.log(call.To); 
});

// Error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  console.log('Error!!!');
});

app.listen(process.env.PORT || 8000);
console.log("Server listening on port localhost:8000");

