FROM node:20-alpine

WORKDIR /app

ENV SKIP_DASHBOARD_PREBUILD=1 \
    DASHBOARD_PORT=3103

RUN apk add --no-cache curl

# Copy only dashboard files (context is project root)
COPY frontend/dashboard/package*.json ./

RUN npm ci --legacy-peer-deps

COPY frontend/dashboard ./

EXPOSE 3103

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3103", "--strictPort"]
