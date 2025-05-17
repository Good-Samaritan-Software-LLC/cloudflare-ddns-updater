FROM node:22-alpine AS base

# build stage
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# runtime stage
FROM base AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/dynamic-dns.js"]
