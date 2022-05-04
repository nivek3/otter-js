# The builder image
FROM node:14.17.0-alpine AS builder

RUN apk add --no-cache python make gcc g++ bash git
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

USER node
WORKDIR /home/node/app

COPY --chown=node:node package.json \
	package-lock.json \
	./

RUN npm install

COPY --chown=node:node . .
RUN npm run compile

# The production image
FROM node:14.17.0-alpine as production

RUN apk add --no-cache python make gcc g++ bash git
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

ENV NODE_ENV production
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

USER node
WORKDIR /home/node/app

COPY --from=builder --chown=node:node /home/node/app/package*.json ./
COPY --from=builder --chown=node:node /home/node/app/build/ ./build/
COPY --chown=node:node . .

RUN npm ci --production

EXPOSE 3000
EXPOSE 50051

CMD ["node", "build/src/server.js"]
