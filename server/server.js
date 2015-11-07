var express = require('express');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var request = require('request');
var reqPromise = require('request-promise');

var config = require('./config.js');
var mongoose = require('mongoose');

var twilio = require('twilio');

var Bing = require('node-bing-api')({ accKey: "oMNfs6eyBszFZq51gCfgClMac+tn9pH+XmL0v3V7bPU" });

var TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
    TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
    TWILIO_NUMBER = config.TWILIO_NUMBER;

var TwilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var TwimlResp = new twilio.TwimlResponse();


var app = express();

app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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

var priceLineRequest = function(location, checkIn, checkOut, options, numRoom, sort) {
  // what is rguid=3459hjdfdf
  var queryStr = location + "?" + "check-in=" + checkIn + "&check-out=" + checkOut
                  + "&currency=USD&response-options=" + options + "&rooms=" + numRoom
                  + "&sort=" + sort + "&offset=0&page-size=5";
  console.log(queryStr);

  var options = {
    uri: 'https://www.priceline.com/pws/v0/stay/retail/listing/' + queryStr,
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true
  }
  reqPromise(options)
    .then(function(data) {
      console.log("Data from PriceLine API");
      console.log(data);
    })
    .catch(function(err) {
      if (err) console.log("Call to PriceLine API failed");
    })
}

app.post('/texts', function(req, res) {
  // var body = req.body;
  var note = req.body.Body;
  var phoneToMssg = req.body.From;
  // console.log(body);
  // console.log("******************");
  console.log(note);
  console.log('Number is ' + req.body.From);

  // Bing.web(note, {
  //     top: 10,  // Number of results (max 50)
  //     skip: 3,   // Skip first 3 results
  //   }, function(error, res, body){

  //   // body has more useful information, but for this example we are just
  //   // printing the first two results
  //   console.log(body.d.results[0]);
  //   console.log(body.d.results[1]);
  // });

  if (note === "priceline" || "Priceline") {
    var str = "Where is your desired location?";


    // TwilioMessage(res, phoneToMssg, "Hello from Twilio");
  }

    // Stub response
  var location = "new york";
  var checkIn = "20151201";
  var checkOut = "20151202";
  var responseOptions = "DETAILED_HOTEL,NEARBY_ATTR";
  var rooms = "1";
  var sort = "HDR";
  priceLineRequest(location, checkIn, checkOut, responseOptions, rooms, sort);
  TwilioMessage(res, phoneToMssg, "Hello from Twilio");
})

app.post('/calls', function(req, res) {
  console.log(req);
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
