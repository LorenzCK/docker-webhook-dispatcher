const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');
const minimatch = require('minimatch');
const { spawnSync } = require('child_process');

const app = express();
app.use(bodyParser.json({
    'limit': '25MB',
    'verify': function(req, res, buf, encoding) {
        if(process.env.WEBHOOK_DISPATCHER_SECRET) {
            var requestSignature = req.get('X-Hub-Signature');
            if(!requestSignature) {
                console.error('Request does not include X-Hub-Signature header');
                throw "Missing header";
            }

            var hash = crypto.createHmac('sha1', process.env.WEBHOOK_DISPATCHER_SECRET);
            var expectedSignature = 'sha1=' + hash.update(buf, encoding).digest('hex');
            
            req.verified = crypto.timingSafeEqual(Buffer.from(requestSignature), Buffer.from(expectedSignature));
        }
        else {
            req.verified = true;
        }
    }
}));

const WEB_HOST = process.env.WEBHOOK_DISPATCHER_HOST || '0.0.0.0';
const WEB_PORT = process.env.WEBHOOK_DISPATCHER_PORT || 8080;

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
    console.log('No hook scripts found (use environment variables or mount /app/hooks)');
    process.exit(1);
}
console.log('Registered ' + hookMap.length + ' hooks:');
hookMap.forEach(element => {
    console.log(JSON.stringify(element));
});

if(!process.env.WEBHOOK_DISPATCHER_SECRET) {
    console.error('Environment variable WEBHOOK_DISPATCHER_SECRET not set, will not verify requests');
}

app.post('*', function(req, resp) {
    if(!req.get('User-Agent').includes('GitHub-Hookshot')) {
        console.error('Non GitHub webhook request');
        resp.sendStatus(400);
        return;
    }

    const repoId = req.body.repository.id;
    const hookEvent = req.get('X-GitHub-Event');

    if(!req.verified) {
        console.error('Request not verified');
        resp.sendStatus(401);
        return;
    }

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
