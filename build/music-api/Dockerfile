FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY local-server.mjs ./
RUN mkdir -p /app/data
EXPOSE 4173
# Don't serve static files — Nginx handles that
# Only run API routes
CMD ["node", "--input-type=module", "-e", "import('./local-server.mjs')"]
