FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Ensure data directory exists
RUN mkdir -p data

EXPOSE 3088

CMD ["node", "server.js"]
