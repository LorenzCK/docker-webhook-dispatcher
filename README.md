# Docker Webhook Dispatcher

![Docker Hub pulls](https://img.shields.io/docker/pulls/lorenzck/webhook-dispatcher.svg?style=flat)

Simple Web service container that handles GitHub Web hooks and executes commands.

Docker, docker-compose, make and bash are included, allowing you to run scripts or interact with your containers in response to your Webhooks.

## Usage

The container includes a Node server that responds at any HTTP path on port `8080`.
It is intended to be used behind an HTTP proxy.

For instance, with Nginx as a proxy:

```
location /webhook {
    proxy_pass http://webhook-dispatcher-host:8080/;
}
```

The following environment variables are used by the container:

* `WEBHOOK_DISPATCHER_HOST`: host on which to listen (defaults to *0.0.0.0*),
* `WEBHOOK_DISPATCHER_PORT`: port on which to listen (defaults to *8080*),
* `WEBHOOK_DISPATCHER_SECRET`: secret string used to sign GitHub Webhook requests.
  *Note: if this variable is not set, the container will not validate requests.*

## Hook scripts

The container supports 2&nbsp;ways of specifying Web hook scripts:
using scripts in a directory or
using environment variables.

### Script directory

Directory `/app/hooks` is automatically used to load Web hook scripts:
every `.sh` file is loaded and filenames are used to map to repository IDs and Webhook events.

For instance:

* `123456.sh`: executed for every GitHub Webhook event for repository #123456,
* `123456-push.sh`: executed for *push* events on repository #123456.

### Environment variables

Variables starting with `HOOK_` are loaded and parsed using the same rules as filenames above.

For instance:

* `HOOK_123456=command`: executed for every event on repository #123456,
* `HOOK_123456_PUSH=command`: executed for *push* events on repository #123456.
