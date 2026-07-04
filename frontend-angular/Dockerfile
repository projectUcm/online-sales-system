# Stage 1: Build
FROM --platform=linux/amd64 node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inject runtime API URL if provided via build arg
ARG API_URL=""
RUN if [ -n "$API_URL" ]; then \
      sed -i "s|private baseUrl = '[^']*'|private baseUrl = '$API_URL'|" src/app/services/api.ts src/app/services/auth.ts; \
    fi

RUN npm run build

# Stage 2: Production
FROM --platform=linux/amd64 nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos construidos
COPY --from=build /app/dist/frontend-angular/browser /usr/share/nginx/html

EXPOSE 80

# Healthcheck para ECS
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
