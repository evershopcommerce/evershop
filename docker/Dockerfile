# The OFFICIAL evershop/evershop image.
#
# This is a CONSUMER project, not a build of this monorepo: it installs the
# published @evershop/evershop package from npm, so the image contains exactly
# what a merchant gets from `npm install @evershop/evershop`. That is why the
# release pipeline builds this only AFTER the npm publish step succeeds.
#
# (The Dockerfile at the repo root is a different thing — it builds the
# monorepo from source for development, and is not published.)
#
#   docker build -f docker/Dockerfile --build-arg EVERSHOP_VERSION=2.2.1 .
#
FROM node:20-alpine
WORKDIR /app

ARG EVERSHOP_VERSION
RUN test -n "$EVERSHOP_VERSION" || \
  (echo "ERROR: --build-arg EVERSHOP_VERSION=<version> is required" && exit 1)

COPY docker/package.json ./package.json

# --save-exact pins the image to the version being released. A caret range
# would let a rebuild of the "2.2.1" image silently pull a newer package.
RUN npm install "@evershop/evershop@${EVERSHOP_VERSION}" --save-exact --no-audit --no-fund \
  && npm run build

# evershop start listens on $PORT, default 3000.
EXPOSE 3000

CMD ["npm", "run", "start"]
