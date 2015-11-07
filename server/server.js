var express = require('express');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var request = require('request');

var config = require('./config.js');
var mongoose = require('mongoose');

var twilio = require('twilio');

var Bing = require('node-bing-api')({
	accKey: "oMNfs6eyBszFZq51gCfgClMac+tn9pH+XmL0v3V7bPU"
});

var TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
TWILIO_NUMBER = config.TWILIO_NUMBER;

var TwilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var TwimlResp = new twilio.TwimlResponse();


var app = express();

app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, '../public')));

var respOption = {
	root: __dirname + '/../views/'
}

var responseWithHTML = function(res, fileName) {
	var state = 0;
	res.sendFile(fileName, respOption, function(err) {
		if (err) {
			console.log(err);
			res.status(err.status).end();
		} else {
			console.log('Sent:', fileName);
			return state++;
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
	// var body = req.body;
	var note = req.body.Body;
	var phoneToMssg = req.body.From;
	// console.log(body);
	// console.log("******************");
	console.log(note);
	console.log('Number is ' + req.body.From);
	//queries Bing for the search term that the user responded to the initial message with
	// Bing.web(note, {
	//     top: 10,  // Number of results (max 50)
	//     skip: 3,   // Skip first 3 results
	//   }, function(error, res, body){

	//   // body has more useful information, but for this example we are just
	//   // printing the first two results
	//   console.log(body.d.results[0]);
	//   console.log(body.d.results[1]);
	// });

	//A list of all the possible messages that the user can be asked.
	var userResponseList = {

	};

	var msgArray = {
		"Thanks for texting Hotline-Bing! You can respond to this message with a general search term and get the results, or with PRICELINE and we will initiate a Priceline search. Text 'Thank You' at any point to stop searching."
		"Your message indicated you wanted to Query Priceline": 1,
		"Where is the desired location that you want to book a hotel in?": 2,
		"For what dates do you want the hotel?": 3,
		"What is your maximum price per night?": 4,
		"Here is a list of hotels: " + hotelListFromAPI: 5,
			"Here is your hotel: " + hotelSelectorFromAPI: 6,
			"This is the hotel you're staying in. Would you like to book it?": 7 "Your hotel has been booked": 8
	};

	//TODO: hotelListFromAPI-- returns a list of hotels that meet the criteria returned by the user in response to message prompts 2, 3 & 4.

	if (note === "Thank You" || "Thank you" || "thank you" || "Thank you!" || "thank you!") {
		var exit = true;
	}

	if (note === "priceline" || "Priceline") {
		var str = "What do you want to know?";
		if (exit == true) {
			//DO NOTHING
		} else {
			TwilioMessage(res, phoneToMssg, msgArray[state]);
		}
	}
})


app.post('/calls', function(req, res) {
	console.log(req);
});

TwilioClient.calls('CA5eb3bb87eff9ad46de801ac0fc302d78').get(function(err, call) {
	console.log(call.To);
});

// Error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

app.use(function(err, req, res, next) {
	console.log('Error!!!');
});

app.listen(process.env.PORT || 8000);
console.log("Server listening on port localhost:8000");
