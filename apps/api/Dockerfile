FROM node:22-alpine

RUN apk add --no-cache wget ffmpeg

WORKDIR /app

COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/src ./apps/api/src

WORKDIR /app/apps/api

RUN npm install
RUN npm run build

ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
