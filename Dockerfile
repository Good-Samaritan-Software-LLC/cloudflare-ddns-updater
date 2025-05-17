FROM node:22-alpine AS base

# build stage
FROM base AS builder
WORKDIR /app
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install
COPY src ./src
RUN yarn build

# runtime stage
FROM base AS runtime
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/index.js"]