const http = require("http");
const VoiceResponse = require("twilio").twiml.VoiceResponse;

http
  .createServer((req, res) => {
    const response = new VoiceResponse();

    response.say("Thank you for calling Alton Time and Temp! This application is currently in development. Please try calling again later.");

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(response.toString());
  })
  .listen(1337, '127.0.0.1')