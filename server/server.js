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
var HashMap = require('hashmap');
var http = require('http');
var fs = require('fs');
var havenondemand = require('havenondemand');
var payments = require('./payments.js');

//Using Haven on Demand to parse the text of the user's message.
var havenClient = new havenondemand.HODClient('http://api.idolondemand.com', '61e95a27-c3af-453b-9322-3bce956c0788');

var TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
TWILIO_NUMBER = config.TWILIO_NUMBER;

var TwilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var TwimlResp = new twilio.TwimlResponse();

//TODO:Function to format note names to append the user specific string generated in the Hashmap and store them in the MongoDB.
var reassVal = function(note, number) {
	return note + number;
}

mongoose.connect(config.MONGODB_URL, function(err) {
	if (err) {
		console.log(err);
	}
});

mongoose.connection.on('connected', function() {
  var mongourl = process.env.MONGODB_URL || 'mongodb://localhost/hotlinebing';
  console.log("MongoDB connected " + mongourl);
})

mongoose.connection.on('error', function(err) {
  console.log('MongoDB default connection error: ' + err);
})

var QuerySchema = new mongoose.Schema({
  number: String,
  firstHotel: String,
  secondHotel: String,
  thirdHotel: String,
  fourthHotel: String,
  fifthHotel: String
});

var queryModel = mongoose.model('Query', QuerySchema);

var app = express();

app.use(partials());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(cookieParser());


app.use(express.static(path.join(__dirname, '../public')));

var TwilioMessage = function(res, phone, message) {
	TwilioClient.messages.create({
		to: phone,
		from: TWILIO_NUMBER,
		body: message
	}, function(err, data) {
		// res.send('Message is inbound!');
	});
}

var priceLineRequest = function(location, checkIn, checkOut, res, phoneToMssg) {
	// what is rguid=3459hjdfdf
  var options = "DETAILED_HOTEL,NEARBY_ATTR";
	var queryStr = location + "?" + "check-in=" + checkIn + "&check-out=" + checkOut + "&currency=USD&response-options=" + options + "&rooms=1&sort=PRICE" + "&offset=0&page-size=5";
	console.log(queryStr);

	var options = {
		uri: 'https://www.priceline.com/pws/v0/stay/retail/listing/' + queryStr,
		headers: {
			'User-Agent': 'Request-Promise'
		},
		json: true
	}

  var dataObj;

	reqPromise(options).promise().bind(this)
		.then(function(data) {
			var exStr = data.hotels;
			console.log(data);
			TwilioMessage(res, phoneToMssg, "Found 5 hotels");
      this.dataObj = data;
      console.log(this.dataObj);
		})
		.catch(function(err) {
			if (err) console.log("Call to PriceLine API failed");
		})
}

var months = {
  "JANUARY": 1,
  "FEBRUARY": 2,
  "MARCH": 3,
  "APRIL": 4,
  "MAY": 5,
  "JUNE": 6,
  "JULY": 7,
  "AUGUST": 8,
  "SEPTEMBER": 9,
  "OCTOBER": 10,
  "NOVEMBER": 11,
  "DECEMBER": 12
}

app.post('/texts', function(req, res) {
  var note = req.body.Body;
  var phoneToMssg = req.body.From;
  console.log(note);
  console.log('Number is ' + req.body.From);

  var data = {
    text: note,
    entity_type: ["places_eng", "date_eng"]
  };

  havenClient.call('extractentities', data, function(err, resp, body) {
    var entities = resp.body.entities;
    var loc;
    var date1;
    var date2;
    for (var i=0; i < entities.length; i++) {
      var entity = entities[i]
      var type = entity.type
      if (type === 'places_eng') {
        loc = entity.original_text
      }
      console.log("sth"+date1)
      if (type === 'date_eng') {
        if (date1 === undefined){
          date1 = entity.original_text;
          console.log("ssgg"+date1)
        } else
          date2 = entity.original_text;
      }
    }
    console.log(loc);
    console.log(date1);
    console.log(date2);
    console.log(resp.body);

    // date1, date2 parsing
    date1 = date1.toUpperCase();
    date2 = date2.toUpperCase();

    console.log("Date1: " + date1);
    console.log("Date2: " + date2);

    var date1Month = date1.split(" ")[0];
    var date1Day = date1.split(" ")[1];
    date1Day = date1Day ? date1Day : "";
    date2Day = date2Day ? date1Day : "";
    var date2Month = date2.split(" ")[0];
    var date2Day = date2.split(" ")[1];

    date1Month = months[date1Month] ? months[date1Month] : date1Month;
    date2Month = months[date2Month] ? months[date2Month] : date2Month;

    date1 = "2015" + date1Month + date1Day;
    date2 = "2015" + date2Month + date2Day;

    priceLineRequest(loc, date1, date2, res, phoneToMssg)
  });
  // var phoneMapObj = map.get(phoneToMssg);

  //TODO: hotelListFromAPI-- returns a list of hotels that meet the criteria returned by the user in response to message prompts 2, 3 & 4.

  //Defined a local escape value. No other condition makes this true and therefore it's false in all other instances.
  if (note === "Thank You" || note === "Thank you" || note === "thank you" || note === "Thank you!" || note === "thank you!") {
  	TwilioMessage(res, phoneToMssg, "Thanks for using Hotline-Bing. Respond with any message to start a new search.");
  }

  TwilioMessage(res, phoneToMssg, "End Twilio");
});

//Queries Bing for the search term that the user responded to the initial message with.
// Bing.web(note, {
//  top: 10, // Number of results (max 50)
//  skip: 0, // Skip first 3 results
// }, function(error, res, body) {

//  // body has more useful information, but for this example we are just
//  // printing the first two results
//  var searchResponse1 = body.d.results[0];
//  var searchResponse2 = body.d.results[1];
// });

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
