# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages ./packages
COPY extensions ./extensions
COPY themes ./themes
RUN npm install --legacy-peer-deps

# Build the application
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/themes ./themes
COPY --from=builder /app/extensions ./extensions
COPY --from=builder /app/public ./public
COPY --from=builder /app/media ./media
COPY --from=builder /app/config ./config
COPY --from=builder /app/translations ./translations      

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "run", "start"]
# DEVELOPMENT image — builds this monorepo from source.
#
# This is NOT the published evershop/evershop image. That one is built from
# docker/Dockerfile, which installs the released @evershop/evershop package
# from npm so the image matches what merchants actually run. Use this one to
# get a container running the working tree (contributing, reproducing a bug).
#
# It must build from a CLEAN CHECKOUT, which is what CI has. The previous
# version could only build on a configured working directory, for two reasons:
#
#   1. It COPYed config/, themes/, extensions/, public/ and media/ — none of
#      which are tracked in git. They exist only after an install, so a missing
#      COPY source failed the build immediately anywhere else. They are created
#      empty here instead, to be filled by the installer or a volume mount.
#   2. It ran `npm run build`, which executes packages/evershop/dist/bin/build.
#      dist/ is a gitignored artifact and NO install hook creates it (the
#      package has `prepack`, which only runs on publish), so the step relied
#      on a dist/ left over on the host. The image now compiles src -> dist
#      itself, before building.
#
# Base image is Node 20: the minimum this project supports, and what CI tests
# against. The previous node:18-alpine was below that floor and is past EOL.

FROM node:20-alpine
WORKDIR /app

# husky's `prepare` hook runs during `npm install` and exits non-zero when
# there is no .git directory — which .dockerignore deliberately excludes.
ENV HUSKY=0

COPY . .

# Project directories that are not tracked in git but that the app expects to
# exist: media/ for uploads, public/ for static files, themes/ and extensions/
# for add-ons, config/ for node-config.
RUN mkdir -p config themes extensions public media

# compile: TypeScript src -> dist via swc (what `build` and `start` execute).
# build:   webpack bundles for the storefront and admin.
RUN npm install \
  && npm run compile \
  && npm run compile:db \
  && npm run build

# The server listens on $PORT, defaulting to 3000 (bin/lib/normalizePort.js).
# The previous EXPOSE 80 matched neither the default nor docker-compose.yml.
EXPOSE 3000

CMD ["npm", "run", "start"]
