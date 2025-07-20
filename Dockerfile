FROM node:18-alpine

WORKDIR /app

RUN npm install -g npm@9

COPY package*.json .
COPY packages ./packages
COPY config ./config
COPY public ./public
COPY media ./media
COPY translations ./translations

RUN npm install
RUN npm run compile

WORKDIR /app/packages/postgres-query-builder

RUN npm install
RUN npm run compile
RUN npm install @evershop/product_review

WORKDIR /app

RUN npm run build

EXPOSE 80
CMD ["npm", "run", "start"]
