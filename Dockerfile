FROM node:20-alpine

WORKDIR /app

copy package*.json ./
RUN npm install --omit=dev

copy . .

EXPOSE 3000

CMD ["node", "server.js"]