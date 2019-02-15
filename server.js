const express = require('express');
const fs = require('fs');
const app = express();

const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const WEB_PORT = process.env.WEB_PORT || 8080;

function parseHookString(s, originalFile, hookCommand) {
    var m = s.match(/([0-9]+)(?:[-_]?([a-zA-Z]+))?/);
    if(!m || m.length < 2) {
        console.error((originalFile || s) + ' does not match valid syntax');
        return null;
    }

    var repoId = new Number(m[1]);
    if(Number.isNaN(repoId)) {
        console.error((originalFile || s) + ' repository ID is non-numeric');
        return null;
    }
    var hookType = m[2];
    if(!hookType) {
        hookType = null;
    }

    return {
        'id': repoId,
        'hook': hookType,
        'command': (originalFile || hookCommand)
    };
}

var hookMap = new Array();

// Load hooks from filesystem
const files = fs.readdirSync('./hooks');
files.forEach(element => {
    if(element.endsWith('.sh')) {
        var hookInfo = parseHookString(element.substring(0, element.length - 3), './hooks/' + element);
        if(hookInfo) {
            hookMap.push(hookInfo);
        }
    }
});

// Load hooks from environment
for(var element in process.env) {
    console.log('Env: ' + element);
    if(element.startsWith('HOOK_')) {
        var hookInfo = parseHookString(element.substring(5).toLowerCase(), null, process.env[element]);
        if(hookInfo) {
            hookMap.push(hookInfo);
        }
    }
}

if(hookMap.length == 0) {
    console.log('No hook scripts found in /app/hooks directory');
    process.exit(1);
}
console.log('Registered ' + hookMap.length + ' hooks:');
hookMap.forEach(element => {
    console.log(JSON.stringify(element));
})

app.post('*', function(req, resp) {
    console.log("Connection from %s", req.ip); // this logs the client's IP address
  
    resp.status(200); // this is not required
    resp.send("Hello world!");
});

const server = app.listen(WEB_PORT, WEB_HOST, function() {
    console.log("Listening on " + WEB_HOST + ":" + WEB_PORT + "...");
});
