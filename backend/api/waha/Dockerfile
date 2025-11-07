FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
WORKDIR /deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm install

FROM base AS build
WORKDIR /build
ENV NODE_ENV=development
COPY --from=deps /deps/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY --from=build /build/dist ./dist
EXPOSE 3908
CMD ["node", "dist/server.js"]
