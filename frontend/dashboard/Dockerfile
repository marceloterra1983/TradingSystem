FROM node:20-alpine

WORKDIR /app

ENV SKIP_DASHBOARD_PREBUILD=1 \
    DASHBOARD_PORT=9080

RUN apk add --no-cache curl

COPY package*.json ./

RUN npm ci

COPY . ./

EXPOSE 9080

CMD ["npm", "run", "dev:vite"]
