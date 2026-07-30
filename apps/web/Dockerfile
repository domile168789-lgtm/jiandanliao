FROM node:22-alpine AS build

WORKDIR /app

COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/vite.config.ts ./apps/web/vite.config.ts
COPY apps/web/index.html ./apps/web/index.html
COPY apps/web/public ./apps/web/public
COPY apps/web/src ./apps/web/src

WORKDIR /app/apps/web

RUN npm install
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist/ /usr/share/nginx/html/

EXPOSE 80
