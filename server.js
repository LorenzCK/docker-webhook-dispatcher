const express = require('express');
const fs = require('fs');
const app = express();

const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const WEB_PORT = process.env.WEB_PORT || 8080;

function parseHookString(s, originalFile) {
    var m = s.match(/([0-9]+)(?:-?([a-zA-Z]+))?/);
    if(!m || m.length < 2) {
        console.error('File ' + (originalFile || s) + ' does not match valid syntax');
        return null;
    }

    var repoId = new Number(m[1]);
    if(Number.isNaN(repoId)) {
        console.error('File ' + (originalFile || s) + ' repository ID is non-numeric');
    }
    var hookType = m[2];
    if(!hookType) {
        hookType = null;
    }

    console.log('File ' + (originalFile || s) + ' registered for repo #' + repoId + ', hook ' + hookType);
}

const files = fs.readdirSync('./hooks');
var fileMap = new Array();
files.forEach(element => {
    console.log('File: ' + element);
    if(element.endsWith('.sh')) {
        var hookInfo = parseHookString(element.substring(0, element.length - 3), element);
        if(hookInfo) {
            fileMap.push(hookInfo);
        }
    }
});
if(fileMap.length == 0) {
    console.log('No hook scripts found in /app/hooks directory');
    process.exit(1);
}

app.post('*', function(req, resp) {
    console.log("Connection from %s", req.ip); // this logs the client's IP address
  
    resp.status(200); // this is not required
    resp.send("Hello world!");
});

const server = app.listen(WEB_PORT, WEB_HOST, function() {
    console.log("Listening on " + WEB_HOST + ":" + WEB_PORT + "...");
});
