# The builder image
FROM node:22.12.0-alpine AS builder

RUN apk add --no-cache python3 py3-pip make gcc g++ bash git
RUN npm install --global pnpm@10.12.1
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

USER node
WORKDIR /home/node/app

COPY --chown=node:node package.json \
	pnpm-lock.yaml \
	.npmrc \
	./

RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .
RUN pnpm run compile

# The production image
FROM node:22.12.0-alpine as production

RUN apk add --no-cache python3 py3-pip make gcc g++ bash git
RUN npm install --global pnpm@10.12.1
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

ENV NODE_ENV production
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

USER node
WORKDIR /home/node/app

COPY --from=builder --chown=node:node /home/node/app/package.json ./
COPY --from=builder --chown=node:node /home/node/app/pnpm-lock.yaml ./
COPY --from=builder --chown=node:node /home/node/app/.npmrc ./
COPY --from=builder --chown=node:node /home/node/app/build/ ./build/
COPY --chown=node:node . .

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000
EXPOSE 50051

CMD ["node", "build/src/server.js"]
