#HOTLINE-BING

##The one stop hotline.

![](http://www.bet.com/content/dam/betcom/images/2015/10/Music-10-16-10-31/102015-music-drake-hotline-bling-gif-3.gif.custom1200x675x20.dimg)

A product of YHACK-2015, Hotline-Bing is an sms driven web client. Based on initial user input as stored in `note` the query is either handed off to Haven-On-Demand where text analysis is done and the proper dates and locations are returned, or given directly to Bing.

if the user indicates that she wants to look for a hotel on Priceline than the API is queried with the users input and the top hotels are returned. The user gets to see the top hotel listings in the selected area with the option to learn more about any of them. If they user indicates that they would like to `pay` then a link to the [Braintree](https://www.braintreepayments.com/) payments system is sent to them where they can then pay for the hotel room at that time.

##Roll this yourself.
To roll this yourself it would be quite simple. Clone this repo and make sure you have `Node` installed. Go about installing all of the dependencies and then replace the developer keys. They are as follows: `merchantId`, `publicKey`, `privateKey` in the `payments.js` file, and the `accKey` for both [Bing](https://www.bing.com/dev/) and [Haven-On-Demand](https://www.havenondemand.com/). Couple this with a fully functioning non-`Sandbox` account from Braintree, a premium [Twilio](https://www.twilio.com/) account & keys and a real payment forum and you're in business.

It's likely that much in this repo is either broken, or written in a really horrible or hacky way. We know this, we wrote it in less than 30 hours over two days. Pull-requests and issues are welcome.
