FROM node:24-bookworm


RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    ca-certificates curl git bash && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev"]