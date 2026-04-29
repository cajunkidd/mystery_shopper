# Multi-stage build: install + compile, then ship a slim runtime layer.

FROM node:20-alpine AS build
WORKDIR /app
# Install deps first to leverage Docker's layer cache.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY openapi.yaml ./openapi.yaml
EXPOSE 4000
# Apply pending migrations on boot — fine for a single instance; with multiple
# replicas you'd run migrations as a separate init step instead.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
