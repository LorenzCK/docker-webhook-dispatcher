const express = require('express');
const app = express();

const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const WEB_PORT = process.env.WEB_PORT || 8080;

app.post('*', function(req, resp) {
    console.log("Connection from %s", req.ip); // this logs the client's IP address
  
    resp.status(200); // this is not required
    resp.send("Hello world!");
});

const server = app.listen(WEB_PORT, WEB_HOST, function() {
    console.log("Listening on " + WEB_HOST + ":" + WEB_PORT + "...");
});
