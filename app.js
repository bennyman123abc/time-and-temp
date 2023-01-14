const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const urlencoded = require('body-parser').urlencoded;

const axios = require("axios");
const app = express();

const pm2 = require("@pm2/io");

const config = require("./config.json");
var weather = null;

const monthTable = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
]

const dayTable = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
]

const totalCalls = pm2.counter({
    name: "Total Calls since Server Reboot",
    id: "app/callcount",
});

process.env.TZ = "America/Chicago";

// Parse incoming POST params with Express middleware
app.use(urlencoded({ extended: false }));

// Create a route that will handle Twilio webhook requests, sent as an
// HTTP POST to /voice in our application
app.post('/voice', async (request, response) => {
    console.log(`Incoming call: ${request.body.From}`);
    totalCalls.inc();
    if (!weather) weather = await getWeather();

    const time = new Date(Date.parse(new Date().toLocaleString()));
    const month = monthTable[time.getMonth()];
    var hour = time.getHours() ; // gives the value in 24 hours format
    var AmOrPm = hour >= 12 ? 'P M' : 'A M';
    hour = (hour % 12) || 12;
    var minute = time.getMinutes();
    const day = dayTable[time.getDay()]
    const date = `${time.getDate()}${nth(time.getDate())}`;
    const year = time.getFullYear();

    // Use the Twilio Node.js SDK to build an XML response
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'woman' }, `Thank you for calling Alton Time and Temperature.`);
    twiml.pause({ length: 1 });
    twiml.say({ voice: "woman" }, `The current time is ${hour}, ${minute}, ${AmOrPm} on ${day}, ${month} ${date}, ${year}.`);
    twiml.pause({ length: 1 });
    if (weather) {
        twiml.say({ voice: "woman" }, `The temperature is currently ${weather.temperature} ${weather.temperature !== 1 ? ",degrees" : ",degree"} fahrenheit with, ${weather.raining ? "precipitation" : "no precipitation"}.`);
    } else {
        twiml.say({ voice: "woman" }, "We're sorry. We were unable to obtain the current weather for the area. Please try calling back again later.");
    }
    twiml.pause({ length: 1 });
    twiml.say({ voice: "woman" }, "Thank you for calling! Goodbye.");

    // Render the response as XML in reply to the webhook request
    response.type('text/xml');
    response.send(twiml.toString());
});

const nth = function(d) {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}

const getWeather = async function() {
    const url = `http://dataservice.accuweather.com/currentconditions/v1/${config.location_key}?apikey=${config.accuweather_key}`;
    const res = await axios.get(url);

    if (res.status !== 200) {
        console.log(`Failed to get weather: ${res.status} ${res.statusText}`);
        return null;
    }

    // console.log(res.data[0].Temperature);

    // console.log(`Current Weather: Temperature: ${res.data[0].Temperature.Imperial.Value}, Raining?: ${res.data[0].HasPrecipitation}`);

    weather = {
        temperature: res.data[0].Temperature.Imperial.Value,
        raining: res.data[0].HasPrecipitation
    }

    console.log(weather)
}

setImmediate(getWeather);
setInterval(getWeather, 30*60000)

// Create an HTTP server and listen for requests on port 3000
app.listen(config.port, () => {
    console.log(`Twilio listening for incoming calls on port ${config.port}`);
});