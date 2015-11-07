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
