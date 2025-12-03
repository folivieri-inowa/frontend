# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm ci

# Copia sorgenti
COPY . .

# Imposta ambiente produzione (le VITE_* vengono compilate nel bundle)
ENV NODE_ENV=production

# Build produzione
RUN npm run build

# Stage 2: Serve con nginx
FROM nginx:alpine

# Copia configurazione nginx custom
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia build dal builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Esponi porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
