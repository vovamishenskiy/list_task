FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
COPY vite.config.js ./
COPY src ./src
COPY index.html ./
RUN npm install && npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY api ./api
COPY package*.json ./
RUN npm install

EXPOSE 4000

CMD ["node", "api/index.js"]
