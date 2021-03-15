var express = require('express');
var dotenv = require('dotenv');
var router = express.Router();

dotenv.config();  // Get config values for twilio usage

// AXIOS 
// TODO: make a request builder for this API
const axios = require('axios')
const targetURI = 'https://api.myturn.ca.gov/public/locations/search';
const requestPayload = {
  "location": { 
    "lat": Number.parseFloat(process.env.CURR_LAT), "lng": Number.parseFloat(process.env.CURR_LONG)},
  "fromDate": util_makeTodayDate(),
  "vaccineData": process.env.VACCINE_DATA,
  "locationQuery": { "includePools": ["default"] },
  "doseNumber": 1,
  "url": "https://myturn.ca.gov/location-select"
}

// CRON
var cron = require('node-cron');
var pollInterval = process.env.CRON_POLL_INTERVAL;

// TODO: these should be retrieved from some DB
// Is this state management?? Answer: NO.
// WHY? Because I need to automate this quickly. Sorry, guys.
var pollTask = null;
var numOfPollsDone = 0;
var latestData = "";

// Twilio SETUP (TEMPORARY)
var twilio = require('twilio');
var twilioPhoneNum = process.env.TWILIO_PHONENUM;
var accountSid = process.env.TWILIO_ACCOUNT_SID;
var authToken = process.env.TWILIO_AUTHTOKEN;
var client = new twilio(accountSid, authToken);

// Hardcoded Clients to receive this text
// TODO: Read from remote instead of .env
var phoneNumArr = process.env.MYPHONENUMARR.split(',');

// Temporary way to check the sum
// TODO: This should be stored in a cache or a DB and retrieved
var storedHash = "";


router.get('/startPoll', (req, res, next) => {
  
  // Call this immediately.
  axiosPostForMyTurn(targetURI, requestPayload);

  // Schedule the pollTask to continue calling every .. minute
  if (!pollTask) {
    pollTask = cron.schedule(pollInterval, () => {
      numOfPollsDone++;
      axiosPostForMyTurn(targetURI, requestPayload);
    });
    console.log('Running Poll for my turn');
    pollTask.start();
  }

  res.render('index', { title: `Polling started at ${new Date()}` });

});


// Stop the cron task.
router.get('/stopPoll', (req, res, next) => {
  if (pollTask) {
    console.log('Stopping poll');
    pollTask.stop();
  }

  res.render('index', { title: `Polling stopped at ${new Date()}` });
});

// Helper to verify Twilio functionality
router.get('/testTwilio', (req, res, next) => {
  sendTextForPhoneNumbersWithMessage(phoneNumArr, "testing twilio directly");
  res.render('index', { title: `Sent ${phoneNumArr.toString()} a message. Check that!!` });
});


// Helper to test AXIOS functionality
router.get('/testAxios', (req, res, next) => {
  axiosPostForMyTurn(targetURI, requestPayload);
})


// Function that will send text with Twilio 
function sendTextForPhoneNumbersWithMessage(arrayOfNumbers, message) {
  for (var i = 0; i < arrayOfNumbers.length; ++i) {
    client.messages.create({
      body: message, to: phoneNumArr[i], from: twilioPhoneNum
    }).then((message) => console.log(message.sid));
  }
}

// Function to call API with Axios
function axiosPostForMyTurn(uri, payload) {
  axios.post(uri, payload)
    .then(res => {

      var data = res.data;

      // Filter out all 3rd party booking
      var non3rdParty = data.locations.filter(function (location) {
        return location.type != "ThirdPartyBooking"
      });

      // Feed this to our "hash function"
      var currHash = util_calculateHashForDifference(data.locations.length, non3rdParty.length);
      if (currHash != storedHash) {

        var dataList = "";

        for (var i = 0; i < data.locations.length; ++i) {
          var dataEntry = "";
          dataEntry = `\nName: ${data.locations[i].name}\nType: ${data.locations[i].type == "ThirdPartyBooking" ? "3rdParty" : "Legit"}\n`;
            dataList += dataEntry;
        }

        console.log("List of data:" , dataList);

        sendTextForPhoneNumbersWithMessage(phoneNumArr, 
          `${util_makeTodayDate()} - Change in vaccine availability.\nListings:${data.locations.length}\n3rdPtyList:${non3rdParty.length}\nCheck https://myturn.ca.gov/location-select. 
          #${numOfPollsDone}${dataList}`);
        storedHash = currHash;
      }
    })
    .catch(error => {
      console.error(error)
    })

}



// Utility function for calculating differential hash
function util_calculateHashForDifference(totalBooking, num3rdPartyBooking) {
  var string1 = `LocationTotal_${totalBooking}`;
  var string2 = `3rdPartyBooking_${num3rdPartyBooking}`;
  // We'll do a simple string concat for now since we don't have anything to hide
  console.log(` Hash: {b64String} at ${new Date()};`);
  return string1 + string2;
}


// TODO: Because writing your own utility function instead of using moment.js (bless her soul) is cooler. Yeah, tell me how bad this is
function util_makeTodayDate(){
  var date = new Date();
  var year_part = date.getFullYear().toString();
  var month_part = date.getMonth()+1;
  month_part = month_part < 10 ? "0" + month_part : month_part.toString(); 
  var day_part = date.getDate().toString();
  var dateString = `${year_part}-${month_part}-${day_part}`;
  return dateString;
}


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: `Number of Polls Done: ${numOfPollsDone}` });
});


module.exports = router;
