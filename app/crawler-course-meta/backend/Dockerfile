FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
