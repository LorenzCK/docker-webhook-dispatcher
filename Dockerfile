FROM node:8-alpine

LABEL maintainer="Lorenz Cuno Klopfenstein <lck@klopfenstein.net>"

# Install bash, make, docker and docker compose
RUN apk update && \
    apk add --no-cache 'bash' && \
    apk add --no-cache 'make' && \
    apk add --no-cache 'docker>18' && \
    apk add --no-cache 'py-pip' && \
    pip --no-cache-dir install 'docker-compose==1.23.1'

RUN npm install -g \
    express \
    body-parser \
    minimatch
ENV NODE_PATH /usr/local/lib/node_modules

# Create working directory with volume for hooks
RUN mkdir -p /app/hooks/
COPY server.js /app/server.js
WORKDIR /app

# External
VOLUME [ "/app/hooks" ]
EXPOSE 8080

CMD ["node", "server.js"]
