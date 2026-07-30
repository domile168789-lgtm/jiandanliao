FROM node:22-alpine AS admin-build

WORKDIR /app

COPY apps/admin-desktop/package.json ./apps/admin-desktop/package.json
COPY apps/admin-desktop/vite.config.ts ./apps/admin-desktop/vite.config.ts
COPY apps/admin-desktop/tsconfig.json ./apps/admin-desktop/tsconfig.json
COPY apps/admin-desktop/index.html ./apps/admin-desktop/index.html
COPY apps/admin-desktop/src ./apps/admin-desktop/src

WORKDIR /app/apps/admin-desktop

RUN npm install
RUN npm run build:renderer

FROM nginx:1.27-alpine

COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=admin-build /app/apps/admin-desktop/dist/ /usr/share/nginx/html/
