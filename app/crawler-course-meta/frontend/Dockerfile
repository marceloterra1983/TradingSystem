FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json .
RUN npm install --force
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.next ./.next
COPY --from=deps /app/public ./public
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
