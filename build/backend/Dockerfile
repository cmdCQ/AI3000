FROM node:18-alpine
RUN npm install -g pm2
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY auth-server.js config.js chat-proxy.js ./
EXPOSE 3301
CMD ["pm2-runtime", "start", "auth-server.js", "--name", "ai3000-auth"]
