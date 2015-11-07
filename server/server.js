var express = require('express');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var request = require('request');
// var _ = require('underscore');
// var engines = require('consolidate');

var config = require('./config.js');
var mongoose = require('mongoose');

// mongoose.connect(config.MONGODB_URL, function(err) {
//   if (err) {
//     console.log(err);
//   }
// });

// MONGODB
// var PhoneSchema = new mongoose.Schema({
//   number: String,
//   accessToken: String,
//   refreshToken: String,
//   expiresIn: Number
// });

// var phoneModel = mongoose.model('Phone', PhoneSchema);

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

app.post('/calls', function(eq, res) {

})


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

app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handler
app.use(function (err, req, res, next) {
    // res.status(err.status || 500);
    
    // res.sendFile('error.html', respOption, function (err) {
    //   if (err) {
    //     console.log(err);
    //     res.status(err.status).end();
    //   }
    //   else {
    //     console.log('Sent:', 'error.html');
    //   }
    // });
});

app.listen(process.env.PORT || 8000);
console.log("Server listening on port localhost:8000");

