FROM node:20-alpine

WORKDIR /app

# Install dependencies first so this layer is cached across source changes
COPY package.json package-lock.json ./
COPY packages/storefront/package.json ./packages/storefront/
COPY packages/postgres-query-builder/package.json ./packages/postgres-query-builder/
COPY packages/create-storefront-app/package.json ./packages/create-storefront-app/
RUN npm ci --ignore-scripts

# Application source
COPY . .

# Runtime directories the app expects to exist
RUN mkdir -p media public config

RUN npm run compile:db \
  && npm run compile \
  && npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
