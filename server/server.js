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

var Bing = require('node-bing-api')({
	accKey: "oMNfs6eyBszFZq51gCfgClMac+tn9pH+XmL0v3V7bPU"
});

var TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
TWILIO_NUMBER = config.TWILIO_NUMBER;

var TwilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var TwimlResp = new twilio.TwimlResponse();

mongoose.connect(config.MONGODB_URL, function(err) {
  if (err) {
    console.log(err);
  }
});

var PhoneSchema = new mongoose.Schema({
  number: String,
  switchVar: Number,
  
})

var app = express();
var switchVar = 0;
var searchVars;

app.use(partials());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

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

var priceLineRequest = function(location, checkIn, checkOut, options, numRoom, sort, res, phoneToMssg) {
  // what is rguid=3459hjdfdf
  var queryStr = location + "?" + "check-in=" + checkIn + "&check-out=" + checkOut
                  + "&currency=USD&response-options=" + options + "&rooms=" + numRoom
                  + "&sort=" + sort + "&offset=0&page-size=5";
  console.log(queryStr);
  // console.log(res);

  var options = {
    uri: 'https://www.priceline.com/pws/v0/stay/retail/listing/' + queryStr,
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true
  }
  reqPromise(options)
    .then(function(data) {
      returnData = data;
      var exStr = data.totalSize;
      console.log(res);
      // TwilioMessage(res, phoneToMssg, "Total size: " + exStr);
    })
    .catch(function(err) {
      if (err) console.log("Call to PriceLine API failed");
    })
}

app.post('/texts', function(req, res) {
	var note = req.body.Body;
	var phoneToMssg = req.body.From;
	console.log(note);
	console.log('Number is ' + req.body.From);
	
  //Queries Bing for the search term that the user responded to the initial message with.
	// Bing.web(note, {
	// 	top: 10, // Number of results (max 50)
	// 	skip: 0, // Skip first 3 results
	// }, function(error, res, body) {

	// 	// body has more useful information, but for this example we are just
	// 	// printing the first two results
	// 	var searchResponse1 = body.d.results[0];
	// 	var searchResponse2 = body.d.results[1];
	// });

	//A list of all the possible messages that the user can be asked.
	var userResponseList = {

	};

	var msgArray = {
		0: "Thanks for texting Hotline-Bing! You can respond to this message with a general search term and get the results, or with PRICELINE and we will initiate a Priceline search. Text 'Thank You' at any point to stop searching.",
		1: "Your message indicated you wanted to Query Priceline",
		2: "Where is the desired location that you want to book a hotel in?",
		3: "For what dates do you want the hotel?",
		4: "What is your maximum price per night?",
		5: "Here is a list of hotels: ",
		6: "Here is your hotel: ",
		7: "This is the hotel you're staying in. Would you like to book it?",
    8: "Your hotel has been booked"
	};

	//TODO: hotelListFromAPI-- returns a list of hotels that meet the criteria returned by the user in response to message prompts 2, 3 & 4.

	//Defined a local escape value. No other condition makes this true and therefore it's false in all other instances.
	if (note === "Thank You" || "Thank you" || "thank you" || "Thank you!" || "thank you!") {
		var exit = true;
	}

  switch(switchVar) {
    // Priceline or Bing
    case 1: 
      if (note === "Priceline" || "priceline") {
        TwilioMessage(res, phoneToMssg, msgArray[1]);  
      }
      break;
    case 2:

    default:
      TwilioMessage(res, phoneToMssg, msgArray[0]);
  }

  var location = "new york";
  var checkIn = "20151201";
  var checkOut = "20151202";
  var responseOptions = "DETAILED_HOTEL,NEARBY_ATTR";
  var rooms = "1";
  var sort = "HDR";
  var dataPromise = priceLineRequest(location, checkIn, checkOut, responseOptions, rooms, sort, res, phoneToMssg);
  console.log(dataPromise);

  TwilioMessage(res, phoneToMssg, "Hello from Twilio");

	//Add a global escape with a boolean.
	// if (exit == true) {
	// 	//DO NOTHING
	// } else if (isPriceline == false) {
	// 	TwilioMessage(res, phoneToMssg, searchResponse1);
	// } else {
	// 	TwilioMessage(res, phoneToMssg, msgArray[state]);
	// }
})


app.post('/calls', function(req, res) {
	console.log(req);
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
