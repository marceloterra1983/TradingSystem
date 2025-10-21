FROM node:20-alpine

WORKDIR /workspace/frontend/apps/dashboard

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source files including scripts
COPY . .

EXPOSE 3101

# Run in development mode (sem watch:docs)
CMD ["npm", "run", "dev:vite"]
