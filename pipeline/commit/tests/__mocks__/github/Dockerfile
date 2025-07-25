FROM node:lts-alpine3.22
RUN apk update && \
	apk add --no-cache openssl curl
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
RUN chown node:node -R /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node package*.json ./
USER node
RUN npm install
COPY --chown=node:node . .
EXPOSE 443
CMD [ "node", "server.js" ]
