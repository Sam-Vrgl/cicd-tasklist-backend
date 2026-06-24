FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build && npx prisma generate


FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/dist ./dist/
COPY prisma ./prisma/

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
