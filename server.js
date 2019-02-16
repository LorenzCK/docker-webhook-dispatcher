const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const minimatch = require('minimatch');
const { spawnSync } = require('child_process');

const app = express();
app.use(bodyParser.json());

const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const WEB_PORT = process.env.WEB_PORT || 8080;

function parseHookString(s, originalFile, hookCommand) {
    var m = s.match(/([0-9]+)(?:[-_]?([a-zA-Z*]+))?/);
    if(!m || m.length < 2) {
        console.error((originalFile || s) + ' does not match valid syntax');
        return null;
    }

    var repoId = new Number(m[1]);
    if(Number.isNaN(repoId)) {
        console.error((originalFile || s) + ' repository ID is non-numeric');
        return null;
    }
    var hookEvent = m[2];
    if(!hookEvent) {
        hookEvent = '*';
    }

    return {
        'id': repoId,
        'event': hookEvent,
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
    if(!req.get('User-Agent').includes('GitHub-Hookshot')) {
        console.error('Non GitHub webhook request');
        resp.sendStatus(400);
        return;
    }

    const repoId = req.body.repository.id;
    const hookEvent = req.get('X-GitHub-Event');

    if(repoId && hookEvent) {
        console.log('Webhook payload: ' + JSON.stringify(req.body));

        hookMap.forEach(hook => {
            if(hook.id != repoId) {
                // Hook doesn't match repo ID
                return;
            }

            if(!minimatch(hookEvent, hook.event)) {
                // Hook doesn't match event
                return;
            }

            console.log('Processing hook with command: ' + hook.command);
            try {
                var processReturn = spawnSync(hook.command, [], {
                    'stdio': 'inherit',
                    'env': process.env
                });
                console.log('Terminated with exit code ' + processReturn.status + '.');
            }
            catch(err) {
                console.error('Command failed');
            }
        });

        resp.sendStatus(200);
    }
    else {
        console.error('Received non-processable request (no repository ID or X-GitHub-Event header), ignoring');
        resp.sendStatus(400);
    }
});

const server = app.listen(WEB_PORT, WEB_HOST, function() {
    console.log("Listening on " + WEB_HOST + ":" + WEB_PORT + "...");
});
