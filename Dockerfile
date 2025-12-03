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

# Stage 2: Production con serve
FROM node:20-alpine AS runner

WORKDIR /app

# Installa serve globalmente
RUN npm install -g serve

# Crea utente non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 frontend

# Copia build
COPY --from=builder /app/dist ./dist

# Cambia ownership
RUN chown -R frontend:nodejs /app

# Passa all'utente non-root
USER frontend

# Esponi porta
EXPOSE 3000

# Serve i file statici con SPA fallback
CMD ["serve", "-s", "dist", "-l", "3000"]
