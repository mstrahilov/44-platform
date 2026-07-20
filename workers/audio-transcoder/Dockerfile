FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /worker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV AUDIO_BATCH_SIZE=4
ENV AUDIO_JOB_DEADLINE_MINUTES=25
ENV AUDIO_CLEANUP_ENABLED=false

USER node
CMD ["node", "src/worker.mjs"]
