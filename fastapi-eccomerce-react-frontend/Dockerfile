# syntax=docker/dockerfile:1.7
# ShopEase frontend — build with Node, serve static files with nginx.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .

# Where the BROWSER reaches the API.
#   http://localhost:8084  -> direct to the published API port (default; same as before)
#   ""  (empty)            -> same-origin "/api", proxied by this image's nginx (no CORS needed)
ARG VITE_BACKEND_URL=http://136.71.169.139:8084
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

# `vite build` only: type-checking (`tsc -b`) belongs in CI, it should not block an image build.
RUN npx vite build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
