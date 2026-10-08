# Transcendence - Online Pong Game

A real-time multiplayer Pong game platform with social features, tournaments, and competitive matchmaking.

**[Project Requirements](https://cdn.intra.42.fr/pdf/pdf/155114/en.subject.pdf)**

## Overview

Transcendence is a web-based Pong game that enables players to compete against each other in real-time matches. Players can connect with friends, join tournaments, and participate in ranked competitive gameplay through an intuitive web interface.

## Features

- **User Authentication**: Sign-up, login, logout with 2FA support
- **Real-time Multiplayer**: Live Pong gameplay with WebSocket communication
- **Social System**: Friend requests, blocking, and user profiles
- **Chat**: In-game and group messaging
- **Tournament Mode**: Bracket-based tournaments with multiple participants
- **Matchmaking**: Ranked matchmaking system with skill-based pairing
- **Game Server**: Dedicated WebSocket game server for physics and game state
- **User Profiles**: Customizable avatars, statistics, and match history

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Game Server**: Fastify + WebSocket
- **Database**: SQLite + Prisma ORM
- **Containerization**: Docker + Docker Compose

## Project Structure

```
├── Frontend/          # React frontend application
├── Backend/          # Express.js backend API
├── GameServer/       # WebSocket game server
├── docker-compose.yml
├── Makefile
└── .env             # Environment configuration
```

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- npm or yarn

### Installation & Setup

1. **Clone the repository** and navigate to the project root

2. **Create `.env` file** with required environment variables:

    ```
    DATABASE_URL="file:./dev.db"
    FRONTEND_PORT=3000
    BACKEND_PORT=3001
    GAME_SERVER_PORT=3002
    ```

3. **Build and start containers**:
    ```bash
    make up
    ```

### Database Setup

To reset the database (deletes all data):

```bash
cd Backend
rm ./prisma/dev.db
rm prisma/migrations/* -rf
npx prisma migrate dev --name init
npx prisma generate
```

## Available Commands

- `make` - Build prebuild and docker images
- `make up` - Start all containers
- `make down` - Stop and remove containers
- `make logs` - View container logs
- `make restart` - Restart all containers
- `make clean` - Stop containers and remove images
- `make deep-clean` - Full reset including volumes

## Development Workflow

1. **Start development environment**: `make up`
2. **View logs**: `make logs`
3. **Make changes** to Frontend, Backend, or GameServer
4. **Containers auto-reload** on file changes (hot reload enabled)
5. **View database**: Access Prisma Studio with `npx prisma studio`

## Project Architecture

- **Frontend**: Single-page application serving game UI and user management
- **Backend**: RESTful API handling authentication, users, matches, chat, and social features
- **Game Server**: Real-time WebSocket server managing game physics and state synchronization
- **Database**: Centralized SQLite database with Prisma ORM for type-safe queries

## Key Features Implementation

### Authentication

- JWT-based authentication
- Two-factor authentication support
- OAuth2 integration

### Real-time Communication

- WebSocket for live game updates
- Real-time chat messaging
- Tournament notifications

### Game Server

- Physics engine for Pong gameplay
- State synchronization across clients
- Latency compensation

## Troubleshooting

**Database sync errors**: Run migration reset commands shown in Database Setup section

**Container connection issues**: Check `.env` variables and ensure ports aren't in use

**WebSocket connection fails**: Verify GameServer container is running with `make logs`

## Contributing

Follow project requirements and maintain code consistency. Use TypeScript for type safety and ensure all changes are properly tested before merging.

Luuks Idea

- uploading avatar then stats go back to default need refresh to get it back |||| Antonio ||||
- Someting with websockets in tournament, some poeple does to bracket some other not
- The end score of tournament is not correct
- When you go offline and come back then score it not in sync and the winner is also wrong
- 2fa is not 2fa, you can use a other phone that was not used to setup 2fa and it will accept that code
- form is missing name and or id field (in tournament)
- Fix the score in the tournament brackets and Single player.
