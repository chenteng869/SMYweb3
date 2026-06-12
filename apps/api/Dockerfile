# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

RUN apk add --no-cache openssl && \
    addgroup -g 1001 nestjs && \
    adduser -u 1001 -G nestjs -s /bin/sh -D nestjs

USER nestjs
WORKDIR /app

COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nestjs /app/package.json ./

ENV NODE_ENV=production
ENV API_PORT=3001

EXPOSE 3001

CMD ["node", "dist/main.js"]
