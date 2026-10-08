FROM node:24-bookworm

RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    ca-certificates curl git bash && \
    rm -rf /var/lib/apt/lists/*


ENV PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"

RUN npm install -g ts-node typescript

WORKDIR /app

COPY . .

RUN npm install fastify @fastify/websocket fastify-cors axios sqlite3


EXPOSE 3002

CMD ["ts-node", "srcs/server.ts"]
