FROM node:20-alpine

WORKDIR /workspace

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy api package
COPY api/package.json ./api/
COPY api/tsconfig.json ./api/

# Copy required workspace packages
COPY packages ./packages/

# Install all dependencies from root (use --no-frozen-lockfile for dev)
RUN pnpm install --no-frozen-lockfile

# Copy api source code
COPY api/src ./api/src/

# Build the API
WORKDIR /workspace/api
RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
