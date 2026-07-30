import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const compose = readFileSync(resolve(repoRoot, 'infra/compose/docker-compose.yml'), 'utf8');
const nginxConfig = readFileSync(resolve(repoRoot, 'infra/nginx/default.conf'), 'utf8');
const nginxDockerfile = readFileSync(resolve(repoRoot, 'infra/nginx/Dockerfile'), 'utf8');
const userWebDockerfile = readFileSync(resolve(repoRoot, 'apps/web/Dockerfile'), 'utf8');
const userWebNginxConfig = readFileSync(resolve(repoRoot, 'apps/web/nginx.conf'), 'utf8');
const userWebViteConfig = readFileSync(resolve(repoRoot, 'apps/web/vite.config.ts'), 'utf8');
const apiDockerfile = readFileSync(resolve(repoRoot, 'apps/api/Dockerfile'), 'utf8');
const wsDockerfile = readFileSync(resolve(repoRoot, 'apps/ws/Dockerfile'), 'utf8');
const apiSource = readFileSync(resolve(repoRoot, 'apps/api/src/index.ts'), 'utf8');
const wsSource = readFileSync(resolve(repoRoot, 'apps/ws/src/server.ts'), 'utf8');

describe('compose baseline', () => {
  it('wires nginx user-web api ws mysql redis and minio', () => {
    expect(compose).toContain('nginx:');
    expect(compose).toContain('user-web:');
    expect(compose).toContain('api:');
    expect(compose).toContain('ws:');
    expect(compose).toContain('mysql:');
    expect(compose).toContain('redis:');
    expect(compose).toContain('minio:');
  });

  it('uses repo root build context for nginx user-web api and ws images', () => {
    expect(compose).toContain('context: ../..');
    expect(compose).toContain('dockerfile: infra/nginx/Dockerfile');
    expect(compose).toContain('dockerfile: apps/web/Dockerfile');
    expect(compose).toContain('dockerfile: apps/api/Dockerfile');
    expect(compose).toContain('dockerfile: apps/ws/Dockerfile');
    expect(nginxDockerfile).toContain('COPY infra/nginx/default.conf');
    expect(nginxDockerfile).toContain('COPY --from=admin-build /app/apps/admin-desktop/dist/');
    expect(userWebDockerfile).toContain('COPY apps/web/vite.config.ts');
    expect(userWebDockerfile).toContain('COPY apps/web/public');
    expect(userWebDockerfile).toContain('COPY --from=build /app/apps/web/dist/');
    expect(apiDockerfile).toContain('COPY tsconfig.base.json ./tsconfig.base.json');
    expect(wsDockerfile).toContain('COPY tsconfig.base.json ./tsconfig.base.json');
  });

  it('defines api and ws healthchecks', () => {
    expect(compose).toContain('http://localhost:${API_PORT:-3001}/api/health');
    expect(compose).toContain('http://localhost:${WS_PORT:-3002}/health');
    expect(compose).toContain('condition: service_healthy');
  });

  it('defines a user-web healthcheck and h5 asset base', () => {
    expect(compose).toContain('http://localhost/healthz');
    expect(userWebNginxConfig).toContain('location = /healthz {');
    expect(userWebViteConfig).toContain("base: '/h5/'");
  });

  it('uses a runnable minio healthcheck and init image', () => {
    expect(compose).toContain('curl", "-fsS", "http://localhost:9000/minio/health/live"');
    expect(compose).toContain('image: minio/mc:latest');
  });

  it('allows overriding the mysql host port for servers that already occupy 3306', () => {
    expect(compose).toContain('"${MYSQL_HOST_PORT:-3306}:3306"');
  });

  it('allows overriding the nginx host port for servers that already occupy 80', () => {
    expect(compose).toContain('"${NGINX_HOST_PORT:-80}:80"');
  });

  it('exposes health endpoints in application sources', () => {
    expect(apiSource).toContain("app.get('/api/health'");
    expect(apiSource).toContain("service: 'api'");
    expect(wsSource).toContain("req.url !== '/health'");
    expect(wsSource).toContain("service: 'ws'");
  });

  it('routes nginx root health and api paths to the intended upstreams', () => {
    expect(nginxConfig).toContain('root /usr/share/nginx/html;');
    expect(nginxConfig).toContain('try_files $uri $uri/ /index.html;');
    expect(nginxConfig).toContain('proxy_pass http://api:3001;');
    expect(nginxConfig).toContain('proxy_set_header Authorization $http_authorization;');
    expect(nginxConfig).toContain('location = /health {');
    expect(nginxConfig).toContain('proxy_pass http://ws:3002/health;');
    expect(nginxConfig).toContain('location /healthz {');
  });

  it('routes h5 app and downloads paths to the intended upstreams', () => {
    expect(nginxConfig).toContain('location /h5');
    expect(nginxConfig).toContain('proxy_pass http://user-web:80/h5;');
    expect(nginxConfig).toContain('location /app');
    expect(nginxConfig).toContain('proxy_pass http://user-web:80/app;');
    expect(nginxConfig).toContain('location /downloads/');
    expect(nginxConfig).toContain('proxy_pass http://user-web:80/downloads/;');
  });

  it('serves h5 app shell, shared assets and downloads inside user-web nginx', () => {
    expect(userWebNginxConfig).toContain('location /downloads/');
    expect(userWebNginxConfig).toContain('location /h5/assets/');
    expect(userWebNginxConfig).toContain('alias /usr/share/nginx/html/assets/;');
    expect(userWebNginxConfig).toContain('location = /h5 {');
    expect(userWebNginxConfig).toContain('location = /app {');
  });
});
