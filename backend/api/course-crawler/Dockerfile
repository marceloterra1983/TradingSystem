FROM mcr.microsoft.com/playwright:v1.56.1-jammy AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production=false

FROM mcr.microsoft.com/playwright:v1.56.1-jammy AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.56.1-jammy AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
CMD ["node", "dist/server.js"]
