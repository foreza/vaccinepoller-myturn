# vaccinepoller-myturn

I got tired of clicking things.
As any good person would do, we automate things.
This solution does the following things:
1. Assumes a lot of information (see TODO) and pings myTurn.gov API for information.
2. If significant change is detected (number of openings OR number of 3rd party openings change) then an alert is sent out to a text


This project is a personal project. 
Use at your own risk.
Or feel free to fork it - just let me know what you've done with it so I can improve my own mess.


## SETUP

### Step 1:
Make a .env file and put it in project root.
Populate it with YOUR credentials and YOUR settings.

```
TWILIO_ACCOUNT_SID=<youraccountidhere>
TWILIO_AUTHTOKEN=<yourauthtoken>
TWILIO_PHONENUM=<aphonenumberfromtwilio>
MYPHONENUMARR=<comma,seperated,value,for,phones>
CURR_LAT=<yourlat>
CURR_LONG=<yourlong>
CRON_POLL_INTERVAL=* * * * *
PORT=STOUT
```

#### TIPS
> Hot Tip 0: What, did you actually think I'd put my API credentials for you to freeload? Get your own! 

You'll need to set up a twilio account if you don't have one already. 
Twilio: https://www.twilio.com/console
Plug in your account sid, auth token.
Get a phone number (it's free) - if you want to remove the "test" stuff, you can pay them. I'm not endorsing them in any way. :)
**IMPORTANT** For the phone numbers - make sure you have manually added each one and verified if you intend to use this completely free. https://www.twilio.com/console/phone-numbers/verified 


> Hot Tip 1: You need to test this on your server? SCP is your friend:
```
scp -i ~/Keys/yourkey.pem .env name@server:your/project/directory
```

This is a tip because yours truly never remembers how to SCP stuff.
BTW - please don't commit your .env file or share that with anybody you don't trust.
That's just sillier than this project and all my past tragedies combined. 

> Hot Tip 2: Can't figure out a port number to use? Never fear. 

I got you. Think of a random phrase. 

```js
function translateToPortNum(word) {
return word.split('').reduce(function(accum, currval) {
    return accum + currval.charCodeAt(0);
}, 0);
}
```

Then, boom.
```js
translateToPortNum("somebodyoncetoldmetheworldwasgonnarollme");
```

Example: 4318


**Note**
In all seriousness, please don't actually use this in your other projects. Some ports are typically reserved. Use your judgement and choose a port and don't share it with others, OK? :)


> Hot Tip 3: Cron intervals in an ENV file? **foreza** you crazy son of a gun.

Feel free to let me know what you think in the issues panel.
Betcha can't type fast enough to let me know how terrible THAT decision was!

In all seriousness, I'm no master of cron.
But this site helps if you want to customize your poll intervals since server costs are expensive and nobody seems to have a webhook handy for their API 
https://crontab.guru/

> Hot Tip 4: How do I find my current location? *wink wink*

Go to https://www.google.com/maps/
Your lat/long (or what you are attempting to pretend you are at) will show up in the URL, like so:
https://www.google.com/maps/@hey,there,

Plug those as your CURR_LAT and CURR_LONG




### Step 2:
Run NPM install:
```
npm install
```

### Step 3:
Run the project:
```
npm start
```

### Step 4:
Call http://localhost:PORT/startPoll to begin polling.


## TODO LIST

You bet I have a lot of stuff to do.
This thing is full of sinful things.
I got this up and running in an afternoon, so do whatever you want with it.
Make me proud.

In order of priority:
1. Refactor axios/twilio functionality to not coexist with each other in index.js.
2. Templatize the SMS messages. 
3. Be able to customize the type of payload being requested from the myTURN API (currently params are hardcoded for vaccineData and location)
4. Pretty print stuff to email (sendgrid?)
5. Store state in redis / postgres instead of in local memory like a peasant
6. Be able to add your friend's phone numbers.


## MyTurn API

I have not yet figured out exactly how this API works.
I have a bare minimum working knowledge of this to hack together this tool.
Once I have a better understanding, I'll put up a PostMan collection.
In the meantime, you might want to manually replace `vaccineData` in case the parameters don't line up for you. 
You can generate your own vaccineData by looking this up through the chrome inspector after putting in your information.
It's on my todo list, trust me!


Sample `POST` Request:

```json
{
  "location": { "lat": 34, "lng": -118 },
  "fromDate": "2021-03-14",
  "vaccineData": "WyJhM3F0MDAwMDAwMDFBZ1ZBQVUiLCJhM3F0MDAwMDAwMDFBZExBQVUiLCJhM3F0MDAwMDAwMDFBZE1BQVUiLCJhM3F0MDAwMDAwMDFBZ1VBQVUiLCJhM3F0MDAwMDAwMDFBc2FBQUUiXQ==",
  "locationQuery": { "includePools": ["default"] },
  "doseNumber": 1,
  "url": "https://myturn.ca.gov/location-select"
}
```

Sample Response:
```json
{
    "eligible": true,
    "vaccineData": "WyJhM3F0MDAwMDAwMDFBZ1ZBQVUiLCJhM3F0MDAwMDAwMDFBZExBQVUiLCJhM3F0MDAwMDAwMDFBZE1BQVUiLCJhM3F0MDAwMDAwMDFBZ1VBQVUiLCJhM3F0MDAwMDAwMDFBc2FBQUUiXQ==",
    "locations": [
        {
            "displayAddress": "757 Westwood Plaza\tLos Angeles\tCA 90095",
            "distanceInMeters": 978.56547925,
            "extId": "a2ut0000006eUqLAAU",
            "regionExternalId": "a30t0000000O1YXAA0",
            "startDate": "2021-03-10",
            "endDate": "2021-06-30",
            "location": {
                "lng": -118.447,
                "lat": 34.0665
            },
            "name": "Ronald Reagan UCLA Medical Center",
            "timezone": "America/Los_Angeles",
            "excludeFromSearch": false,
            "openHours": [],
            "type": "ThirdPartyBooking",
            "externalURL": "https://covid-19vaccines.uclahealth.org/MyChart/covid19/",
            "vaccineData": "W10="
        }
        ...
    ]
}
```


