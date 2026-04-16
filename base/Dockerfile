FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Placeholder values for build-time env (real values injected by Cloud Run at runtime)
ENV MONGODB_URI=mongodb://placeholder
ENV MONGODB_DB=placeholder
ENV JWT_SECRET=placeholder
ENV GEMINI_API_KEY=placeholder
ENV NEXT_PUBLIC_APP_URL=https://placeholder.run.app
ENV SKIN_SERVICE_URL=https://placeholder.run.app
ENV NEXT_PUBLIC_DASHBOARD_URL=https://placeholder.run.app
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
