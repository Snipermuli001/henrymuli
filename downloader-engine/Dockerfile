FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates \
 && python3 -m pip install --break-system-packages --no-cache-dir --upgrade yt-dlp \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
RUN mkdir -p /tmp/ph-downloads && chown -R node:node /app /tmp/ph-downloads
USER node

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
