FROM node:20-alpine AS base

RUN apk add --no-cache curl

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
