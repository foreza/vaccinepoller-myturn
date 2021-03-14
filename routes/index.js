var express = require('express');
var dotenv = require('dotenv');
var router = express.Router();

dotenv.config();  // Get config values for twilio usage

// AXIOS 
// TODO: make a request builder for this API
const axios = require('axios')
const targetURI = 'https://api.myturn.ca.gov/public/locations/search';
const requestPayload = {
  "location": { "lat": 34.0631451, "lng": -118.4367551 },
  "fromDate": "2021-03-14",
  "vaccineData": "WyJhM3F0MDAwMDAwMDFBZ1ZBQVUiLCJhM3F0MDAwMDAwMDFBZExBQVUiLCJhM3F0MDAwMDAwMDFBZE1BQVUiLCJhM3F0MDAwMDAwMDFBZ1VBQVUiLCJhM3F0MDAwMDAwMDFBc2FBQUUiXQ==",
  "locationQuery": { "includePools": ["default"] },
  "doseNumber": 1,
  "url": "https://myturn.ca.gov/location-select"
}

// CRON
var cron = require('node-cron');

// TODO: these should be retrieved from some DB
var pollTask = null;
var numOfPollsDone = 0;

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


router.get('/startPoll', () => {
  if (!pollTask) {
    pollTask = cron.schedule('*/10 * * * *', () => {
      numOfPollsDone++;
      axiosPostForMyTurn(targetURI, requestPayload);
    });
    console.log('Running Poll for my turn');
    pollTask.start();
  }

});


// Stop the cron task.
router.get('/stopPoll', () => {
  if (pollTask) {
    console.log('Stopping poll');
    pollTask.stop();
  }

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
      console.log(`total locations available: ${data.locations.length}`)

      // Filter out all 3rd party booking
      var non3rdParty = data.locations.filter(function (location) {
        return location.type != "ThirdPartyBooking"
      });

      console.log(`3rd party locations available: ${non3rdParty.length}`)

      // Feed this to our hash function
      var currHash = util_calculateHashForDifference(data.locations.length, non3rdParty.length);
      if (currHash != storedHash) {
        sendTextForPhoneNumbersWithMessage(phoneNumArr, `There was a major change in covid19 vaccine availability. Total Openings: ${data.locations.length} Number of 3rd Party: ${non3rdParty.length} \n Check myturn. \n #${numOfPollsDone}`);
        // update the hash after sending
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


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: `Number of Polls Done: ${numOfPollsDone}` });
});


module.exports = router;
