# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install Python 3 + PuLP (CBC solver is bundled with PuLP)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip \
    && pip3 install --break-system-packages pulp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy the Python LP solver so the API route can find it at lib/solver_lp.py
COPY --from=builder /app/lib/solver_lp.py ./lib/solver_lp.py

EXPOSE 3000
CMD ["node", "server.js"]
