FROM node:22-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY apps/ws/package.json apps/ws/tsconfig.json ./apps/ws/
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/ws/src ./apps/ws/src

WORKDIR /app/apps/ws

RUN npm install
RUN npm run build

ENV WS_PORT=3002
EXPOSE 3002
CMD ["node", "dist/server.js"]
