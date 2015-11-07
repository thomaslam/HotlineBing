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
var Bing = require('node-bing-api')({accKey: "oMNfs6eyBszFZq51gCfgClMac+tn9pH+XmL0v3V7bPU"});
var HashMap = require('hashmap');
var http = require('http');
var fs = require('fs');

//Starting the payments flow.
var braintree = require("braintree");

var gateway = braintree.connect({
  environment: braintree.Environment.Sandbox,
  merchantId: "knbnc9wrd6v6mr5j",
  publicKey: "7nvkj52zsysfv6tb",
  privateKey: "d80de536e7a59a6a8a54fdc340467a42"
});

var clientTKN = app.get("/client_token", function (req, res) {
  gateway.clientToken.generate({}, function (err, response) {
    res.send(response.clientToken);
  });
});

app.post("/checkout", function (req, res) {
  var nonce = req.body.payment_method_nonce;
  // Use payment method nonce here
});

gateway.transaction.sale({
  amount: , //insert transaction price variable
  paymentMethodNonce: nonceFromTheClient,
}, function (err, result) {
});
//End server side token handling. Now need to dispatch this to the client and then log the transaction.

//Creates a local web server that the braintree flow is displayed on.
http.createServer(function(req, res){
    fs.readFile('paymentSessionURL.html',function (err, data){
        res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
        res.write(data);
        res.end();
    });
}).listen(6000);

var TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
TWILIO_NUMBER = config.TWILIO_NUMBER;

var TwilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var TwimlResp = new twilio.TwimlResponse();

//TODO:Function to format note names to append the user specific string generated in the Hashmap and store them in the MongoDB.
var reassVal = function (note, number){
		return note + number;
}
//TODO: Full implementation of hashmap only because I'm uncertain of why you would still want to use this is you're appending a unique identifier to the quieries made to the user and then storing those in a DB.
var map = new HashMap();

// mongoose.connect(config.MONGODB_URL, function(err) {
// 	if (err) {
// 		console.log(err);
// 	}
// });

var PhoneSchema = new mongoose.Schema({
	number: String,
//Cooper -- 6:47AM -- Why is the switchvar stored in the MongoDB? Shouldn't that not be necessary if we've logged all of the text messages to date?
	switchVar: Number,
})

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
		res.send('Message is inbound!');
	});
}

var priceLineRequest = function(location, checkIn, checkOut, sort, res, phoneToMssg) {
	// what is rguid=3459hjdfdf
  var options = "DETAILED_HOTEL,NEARBY_ATTR";
	var queryStr = location + "?" + "check-in=" + checkIn + "&check-out=" + checkOut + "&currency=USD&response-options=" + options + "&rooms=1&sort=" + sort + "&offset=0&page-size=5";
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
			returnData = data;
			var exStr = data.totalSize;
			console.log(res);
			// TwilioMessage(res, phoneToMssg, "Total size: " + exStr);
		})
		.catch(function(err) {
			if (err) console.log("Call to PriceLine API failed");
		})
}

var hashMapObject = function(switchVar, location, checkIn, checkOut, sort) {
  return {
    "switchVar": switchVar,
    "location": location,
    "checkIn" : checkIn,
    "checkOut": checkOut,
    "sort": sort
  }
}

var msgArray = {
  0: "Thanks for texting Hotline-Bing! You can respond to this message with a general search term and get the results, or with PRICELINE and we will initiate a Priceline search. Text 'Thank You' at any point to stop searching.",
  1: "Your message indicated you wanted to query Priceline\nWhere is the desired location that you want to book a hotel in?",
  2: "For what dates do you want the hotel?",
  3: "What is your maximum price per night?",
  4: "Here is a list of hotels: ",
  5: "Here is your hotel: " + "Respond with 'okay' to advance.",
  6: "This is the hotel you're staying in. Would you like to book it?",
  7: "Your hotel has been booked. Respond with any message to start a new search."
};

app.post('/texts', function(req, res) {
  var note = req.body.Body;
  var phoneToMssg = req.body.From;
  console.log(note);
  console.log('Number is ' + req.body.From);

  var switchVar;
  if (!map.has(phoneToMssg)) {
    var phoneObj = hashMapObject(0, null, null, null, null);
    map.set(phoneToMssg, phoneObj);
    switchVar = 0;
  } else {
    switchVar = map.get(phoneToMssg).switchVar;
    console.log("Switch var value: " + switchVar);
  }

  var phoneMapObj = map.get(phoneToMssg);

  //TODO: hotelListFromAPI-- returns a list of hotels that meet the criteria returned by the user in response to message prompts 2, 3 & 4.

  //Defined a local escape value. No other condition makes this true and therefore it's false in all other instances.
  if (note === "Thank You" || note === "Thank you" || note === "thank you" || note === "Thank you!" || note === "thank you!") {
  	TwilioMessage(res, phoneToMssg, "Thanks for using Hotline-Bing. Respond with any message to start a new search.");
  }

	//Looking to see if the input is a price.
	function isThisPrice(str) {
		var n = ~~Number(str);
		return String(n) === str && n > 0;
	}

	switch (switchVar) {
		// Priceline or Bing
    case 0:
      phoneMapObj.switchVar++;
      console.log(phoneObj);
      TwilioClient.messages.create({
        to: phoneToMssg,
        from: TWILIO_NUMBER,
        body: msgArray[0]
      }, function(err, data) {
        res.send('Message is inbound!');
      });
      break;
		case 1:
			if (note === "Priceline" || "priceline") {
        phoneMapObj.switchVar++;
				TwilioMessage(res, phoneToMssg, msgArray[1]);
			} else {
        phoneMapObj.switchVar = -1;
        TwilioMessage(res, phoneToMssg, "Respond with a query for Bing here");
      }
			break;
		case 2:
			//In this case we want to return the second message if the user responded with a location.
			phoneMapObj.switchVar++;
      phoneMapObj.location = note;
      console.log(phoneMapObj);
      TwilioMessage(res, phoneToMssg, msgArray[2]);
			break;
		case 3:
			//Looking to see if the user has given us dates for the hotel stay.
			if (Date.parse(note) != NaN) {
        phoneMapObj.switchVar++;
				TwilioMessage(res, phoneToMssg, msgArray[3]);
			}
			break;
		case 4:
			//Looking to see if the user input is equal to a price.
			if (isThisPrice(note)) {
        phoneMapObj.switchVar++;
        console.log(phoneMapObj);
				TwilioMessage(res, phoneToMssg, msgArray[4]);
			}
			break;
		case 5:
			if (note !== "Thank You!" || "thank you" || "Thank you" || "thank You") {
        phoneMapObj.switchVar++;
				TwilioMessage(res, phoneToMssg, msgArray[5]);
			}
			break;
		//I think this should work because you've already hit the prior instance of this statement already, but if not then add another prompt to the proceeding message so there is a signifier/token which we can search for to make this 6th switch easier.
		case 6:
			if (note !== "Thank You!" || "thank you" || "Thank you" || "thank You") {
        phoneMapObj.switchVar++;
				TwilioMessage(res, phoneToMssg, msgArray[6]);
			}
			break;
		case 7:
			if (note === "okay" || "Okay"){
        phoneMapObj.switchVar++;
				TwilioMessage(res, phoneToMssg, msgArray[7]);
			}
			break;
		case 8:
			if (note === "yes" || "sure" || "book"){
        map.get(phoneToMssg).switchVar = 0;
				TwilioMessage(res, phoneToMssg, msgArray[7]);
			}
			break;
		default:
      // Do Bing stuff
      TwilioMessage(res, phoneToMssg, "Bing responds");
	}
	//End switch statement.

	// var location = "new york";
	// var checkIn = "20151201";
	// var checkOut = "20151202";
	// var sort = "HDR";
	// var dataPromise = priceLineRequest(location, checkIn, checkOut, sort, res, phoneToMssg); 
 //  console.log(dataPromise);
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
