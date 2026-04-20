# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL maintainer="Pawan Dubey <pawandubey620438@iilm.edu>"
LABEL description="FinanceFlow Backend API"

# Non-root user for security
RUN addgroup -S financeflow && adduser -S financeflow -G financeflow

WORKDIR /app

# Copy only production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove dev-only files
RUN rm -f .env.example

# Set ownership
RUN chown -R financeflow:financeflow /app

USER financeflow

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
