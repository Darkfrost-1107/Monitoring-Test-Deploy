FROM node:22-alpine

# Set working directory
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# openssl is required by Prisma. PDFs are rendered by the separate Gotenberg service.
RUN apk add --no-cache openssl ca-certificates

# Copy all project files to support the monorepo structure
COPY . .

# Install dependencies
ENV CI=true
RUN pnpm install --frozen-lockfile

# Generate prisma client inside the backend filter context
RUN pnpm --filter backend exec prisma generate

# Build backend and all its workspace dependencies in topological order
RUN pnpm --filter backend... run build

# Expose port
EXPOSE 3000

# Run pending database migrations and start the application
CMD ["sh", "-c", "pnpm --filter backend exec prisma migrate deploy && pnpm --filter backend start:prod"]
