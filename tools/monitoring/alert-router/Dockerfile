# Stage 1: Builder - Installs dependencies
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Runner - Creates the final, smaller image
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

# Expose the port defined in the docker-compose file
EXPOSE 8080

# Command to run the application
CMD [ "npm", "start" ]
