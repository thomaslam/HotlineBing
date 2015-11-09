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
var Q = require('q');

//Using Haven on Demand to parse the text of the user's message.
var havenClient = new havenondemand.HODClient('http://api.idolondemand.com', '61e95a27-c3af-453b-9322-3bce956c0788');

var braintree = require('braintree');

var gateway = braintree.connect({
  environment: braintree.Environment.Sandbox,
  merchantId: 'knbnc9wrd6v6mr5j',
  publicKey: '7nvkj52zsysfv6tb',
  privateKey: 'd80de536e7a59a6a8a54fdc340467a42'
});

var TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
TWILIO_NUMBER = config.TWILIO_NUMBER;
var FISCAL_API_KEY = 'LQSNGG6QNH2A1Z30XMUEQ1MO3E0TST19';

var TwilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
var TwimlResp = new twilio.TwimlResponse();

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
  number: String
});

var HotelSchema = new mongoose.Schema({
  name: String,
  searchResultId: Number,
  address: String,
  roomLeft: Number,
  price: Number,
  phoneNumber: String,
  checkInTime: String,
  checkOutTime: String,
  policyInfo: String,
  messageToSend: String 
})

var queryModel = mongoose.model('Query', QuerySchema);
var hotelModel = mongoose.model('Hotel', HotelSchema);

var app = express();

app.use(partials());
app.use(bodyParser.json());

var parseUrlEnconded = bodyParser.urlencoded({
  extended: true
});

app.use(parseUrlEnconded);

app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


var TwilioMessage = function(res, phone, message) {
	TwilioClient.messages.create({
		to: phone,
		from: TWILIO_NUMBER,
		body: message
	}, function(err, data) {
		// res.send('Message is inbound!');
	});
}

var fiscalNoteRequest = function(res, phoneToMssg, query) {
  var queryStr = "/bills?q=" + query + "&apikey=" + FISCAL_API_KEY;
  console.log(queryStr);
  var options = {
    method: 'GET',
    uri: 'https://fiscalnote.github.io/FiscalNote-API/internal' + queryStr,
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  }

  reqPromise(options).promise().bind(this)
    .then(function(data) {
      console.log(data);
      if (data) {
        var description = data[0].description;
        TwilioMessage(res, phoneToMssg, description);
      }
    })
    .catch(function(err) {
      if (err) {
        // var stack = new Error().stack
        // console.log(stack);
        TwilioMessage(res, phoneToMssg, "Uh oh seems like server is busy. Please try later");
        console.log("Server error");
        res.send('Error: end Twilio call');
      }
    })
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

	reqPromise(options).promise().bind(this)
		.then(function(data) {
			var hotels = data.hotels;
			// console.log(data.hotels);
			if (data.hotels) {
        TwilioMessage(res, phoneToMssg, "Found 5 hotels. Respond with 1-5 to find out more");

        for (var i = 0; i < data.hotels.length; i++) {
          var hotel = data.hotels[i];
          var name = hotel.name;
          var location = hotel.location;
          var rates = hotel.ratesSummary;
          var starRating = hotel.starRating;
          var policies = hotel.policies;
          var checkIn = policies.checkInTime;
          var checkOut = policies.checkOutTime;
          var roomLeft = rates.roomLeft;
          var price = rates.minPrice;
          var policyInfo = policies.importantInfo ? policies.importantInfo[0] : "";

          var address = location.address.addressLine1 + ", " + location.address.cityName + ", " + location.address.zip;
          var hotelPhone = location.address.phone;
          var messageToSend = "\n" + name + "\n" + address + "\n" + "Rating: " + starRating + "\n"
                              + "Minrate: " + price + "\nPhone number: "+hotelPhone;

          console.log(messageToSend);
          hotelModel.findOneAndUpdate({
            "searchResultId": i + 1
          }, {
            name: name,
            address: address,
            phoneNumber: hotelPhone,
            roomLeft: roomLeft,
            address: address,
            price: price,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            policyInfo: policyInfo,
            messageToSend: messageToSend
          }, {upsert: true}, function(err, hotel) {
            if (err) {
              var stack = new Error().stack
              console.log(stack);
              console.log("MongDB error: can't insert hotel models");
              // TwilioMessage(res, phoneToMssg, "Uh oh can't save to MongoDB");
            } else {
              console.log("MongoDB success");
              var message = hotel.messageToSend;
              console.log(message);
              TwilioMessage(res, phoneToMssg, message);
            }
          })
          // TwilioMessage(res, phoneToMssg, messageToSend);
        }
        res.send('Success: end Twilio call');
      } else {
        TwilioMessage(res, phoneToMssg, "Uh oh can't find hotels on PriceLine. Please try again");
        console.log("Call to PriceLine API failed");
        res.send('Error: end Twilio call');
      }
    }).catch(function(err) {
      if (err) {
        var stack = new Error().stack
        console.log(stack);
        TwilioMessage(res, phoneToMssg, "Uh oh seems like server is busy. Please try later");
        console.log("Server error");
        res.send('Error: end Twilio call');
      }
    })
    
}

var months = {
	"JANUARY": "01",
	"FEBRUARY": "02",
	"MARCH": "03",
	"APRIL": "04",
	"MAY": "05",
	"JUNE": "06",
	"JULY": "07",
	"AUGUST": "08",
	"SEPTEMBER": "09",
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

  var prenote = note.split(" ", 2)[0];
  var bingQuery = note.split(" ").splice(1).join("");

  if (prenote === "Bing" || prenote === "bing") {
    Bing.web(bingQuery, {
      top: 5, // Number of results (max 50)
      skip: 0, // Skip first 3 results
    }, function(error, res, body) {

      // body has more useful information, but for this example we are just
      // printing the first two results
      var searchResponse1 = body.d.results[0];
      var respDes1 = searchResponse1.Description;
      var respUrl1 = searchResponse1.Url;
      var searchResponse2 = body.d.results[1];
      var respDes2 = searchResponse2.Description;
      var respUrl2 = searchResponse2.Url;
      var searchResponse3 = body.d.results[2];
      var respDes3 = searchResponse3.Description;
      var respUrl3 = searchResponse3.Url;
      console.log(bingQuery);
      console.log(searchResponse1);
      console.log(searchResponse2);
      console.log(searchResponse3);
      TwilioMessage(res, phoneToMssg, "Bing answers");
      TwilioMessage(res, phoneToMssg, respUrl1 + "\n"+respDes1);
      TwilioMessage(res, phoneToMssg, respUrl2 + "\n"+respDes2);
      TwilioMessage(res, phoneToMssg, respUrl3 + "\n"+respDes3);
    });
  } else if (prenote === "1" || prenote === "2" || prenote === "3" || prenote === "4" || prenote === "5") {
    var hotelQuery = hotelModel.where({ searchResultId: parseInt(prenote)});
    hotelQuery.findOne().exec()
      .then(function(hotel) {
        if (hotel) {
          var roomLeft = hotel.roomLeft;
          var strMssg ="\nName: " + hotel.name + "\nRoom Left: " + roomLeft + "\nCheck in time: " + hotel.checkInTime
                        + "\nCheck out time: " + hotel.checkOutTime + "\nPolicy info: " + hotel.policyInfo;
          TwilioMessage(res, phoneToMssg, strMssg);
        } else {
          console.log("MongDB retrieval problem");
        }
      }, function(err) {
        console.log(err);
      })

  } else if (note === "pay" || note === "Pay" || note === "I want to pay now." || note === "charge" || note === "book it" || note === "get me the room") {
    TwilioMessage(res, phoneToMssg, "Tap on following link to complete payment process\n" + "https://d52fa7eb.ngrok.io/paymentSessionURL.html");
  } else if (prenote === "fiscal" || prenote === "Fiscal") {
    fiscalNoteRequest(res, phoneToMssg, bingQuery);
  } else {
    havenClient.call('extractentities', data, function(err, resp, body) {
        var entities = resp.body.entities;
        var loc;
        var date1;
        var date2;
        for (var i = 0; i < entities.length; i++) {
          var entity = entities[i]
          var type = entity.type
          if (type === 'places_eng') {
            loc = entity.original_text
          }
          if (type === 'date_eng') {
            if (date1 === undefined) {
              date1 = entity.original_text;
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
    TwilioMessage(res, phoneToMssg, "Searching PriceLine... Please wait");
  }
	
	// var phoneMapObj = map.get(phoneToMssg);

  // //Provide a logical switch to prevent the Priceline API from being called every time. THOMAS: If this broke something just remove the entire switch statement and go back to using the single logical statements chained together.
  // switch (notes !== null) {
  //   case 0:
  //     if (note === "pay" || note === "I want to pay now." || note === "charge" || note === "book it" || note === "get me the room") {
  //       TwilioMessage(res, phoneToMssg, "Click on the following link and go through the payment process. Texting thanks after completion will end your session." + app.use(express.static(path.join(__dirname, '../public'))));
  //     };
  //     break;
  //   case 1:
  //     if (note === "search for" || "search") {
  //       TwilioMessage(res, phoneToMssg, Bing.web(note, {
  //           top: 5, // Number of results (max 50)
  //           skip: 0, // Skip first 3 results
  //         },
  //         function(error, res, body) {

  //           // body has more useful information, but for this example we are just
  //           // printing the first two results
  //           var searchResponse1 = body.d.results[0];
  //           var searchResponse2 = body.d.results[1];
  //         }));
  //     };
  //     break;
  //   case 2:
  //     if (note === "Thank You" || note === "Thank you" || note === "thank you" || note === "Thank you!" || note === "thank you!" || note === "thanks") {
  //       TwilioMessage(res, phoneToMssg, "Thanks for using Hotline-Bing. Respond with any message to start a new search.");
  //     };
  //     break;

  //   default:

  // }
//NOTE: I COMMENTED THIS BLOCK OUT TO GET THE SWITCH STATEMENT TO FUNCTION. IF OUTPUT IS NO LONGER COMING THAN THE SWITCH SHOULD BE REMOVED AND THIS SHOULD BE UNCOMMENTED. 9:30PM SATURDAY NIGHT.
	// if (note === "pay" || note === "I want to pay now." || note === "charge" || note === "book it" || note === "get me the room") {
	// 	TwilioMessage(res, phoneToMssg, "Click on the following link and go through the payment process. Texting thanks after completion will end your session." + app.use(express.static(path.join(__dirname, '../public'))));
	// }
	//
	// if (note === "search for" || "search") {
	// 	TwilioMessage(res, phoneToMssg, Bing.web(note, {
	// 			top: 5, // Number of results (max 50)
	// 			skip: 0, // Skip first 3 results
	// 		},
	// 		function(error, res, body) {
	//
	// 			// body has more useful information, but for this example we are just
	// 			// printing the first two results
	// 			var searchResponse1 = body.d.results[0];
	// 			var searchResponse2 = body.d.results[1];
	// 		}));
	// }
	//
	// if (note === "Thank You" || note === "Thank you" || note === "thank you" || note === "Thank you!" || note === "thank you!" || note === "thanks") {
	// 	TwilioMessage(res, phoneToMssg, "Thanks for using Hotline-Bing. Respond with any message to start a new search.");
	// }

	// TwilioMessage(res, phoneToMssg, "End Twilio");
});

app.get('/paymentSessionUrl.html', function (request, response) {

  gateway.clientToken.generate({}, function (err, res) {
    response.render('index', {
      clientToken: res.clientToken
    });
  });

});

app.post('/process', parseUrlEnconded, function (request, response) {

  var transaction = request.body;

  gateway.transaction.sale({
    amount: transaction.amount,
    paymentMethodNonce: transaction.payment_method_nonce
  }, function (err, result) {

    if (err) throw err;

    if (result.success) {

      console.log(result);

      response.sendFile('success.html', {
        root: './public'
      });
    } else {
      response.sendFile('error.html', {
        root: './public'
      });
    }
  });

});


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
