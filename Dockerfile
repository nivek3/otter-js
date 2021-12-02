# The build image
FROM node:14.17.0-alpine AS build

ARG GITHUB_TOKEN

RUN apk add --no-cache python make gcc g++ bash git

WORKDIR /usr/src/app

RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
RUN npm install --ignore-scripts --quiet && npm cache clean --force
RUN git config --global --unset url."https://${GITHUB_TOKEN}@github.com/".insteadOf

COPY package.json \
	package-lock.json \
	./

RUN npm install

COPY . .
RUN npm run compile

# The production image
FROM node:14.17.0-alpine

ENV NODE_ENV production

RUN apk add --no-cache python make gcc g++ bash git

# USER node

WORKDIR /home/node

RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
RUN npm install --ignore-scripts --quiet && npm cache clean --force
RUN git config --global --unset url."https://${GITHUB_TOKEN}@github.com/".insteadOf

COPY --from=build /usr/src/app/package.json \
	/usr/src/app/package-lock.json \
	./
COPY --from=build /usr/src/app/build ./build
COPY . .

RUN npm ci --production

EXPOSE 3000
EXPOSE 50051

CMD ["node", "build/src/server.js"]
