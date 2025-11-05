FROM node:20-alpine

WORKDIR /app

ENV SKIP_DASHBOARD_PREBUILD=1 \
    DASHBOARD_PORT=3103

ARG DASHBOARD_DIR=frontend/dashboard

RUN apk add --no-cache curl

COPY ${DASHBOARD_DIR}/package*.json ./

RUN npm ci

COPY ${DASHBOARD_DIR} ./

EXPOSE 3103

CMD ["npm", "run", "dev:vite"]
