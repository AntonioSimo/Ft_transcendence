# ft_transcendence

<p align="center">
  <strong>A full-stack multiplayer platform built around real-time gaming, authentication and social interaction.</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#architecture">Architecture</a>
  ·
  <a href="#42-modules">42 Modules</a>
  ·
  <a href="#tech-stack">Tech Stack</a>
  ·
  <a href="#installation">Installation</a>
</p>

---

## Overview

**ft_transcendence** is a full-stack web application developed as part of the 42 curriculum.

The project combines a multiplayer Pong experience with user management, secure authentication, live communication, statistics and a modular backend architecture.

Rather than focusing on a single feature, the project brings together several areas of modern web development into one application:

```text
                    ft_transcendence
                           |
        ┌──────────────────┼──────────────────┐
        |                  |                  |
        v                  v                  v
     FRONTEND           BACKEND           DATABASE
        |                  |                  |
   Tailwind CSS         Fastify        SQLite + Prisma
        |                  |                  |
        └──────────────────┼──────────────────┘
                           |
              ┌────────────┴────────────┐
              |                         |
              v                         v
       Authentication             Real-Time
          JWT / 2FA              Pong / Chat
              |
           OAuth 2.0
```

---

# Features

## Multiplayer Pong

The core of the platform is a multiplayer Pong experience supporting **remote players**.

The game is integrated with the rest of the application rather than existing as an isolated component, allowing gameplay data and player interactions to become part of the wider platform.

---

## Authentication & User Management

The platform provides a complete user-management and authentication layer.

It includes:

- standard user management;
- JWT authentication;
- Two-Factor Authentication;
- OAuth 2.0 remote authentication.

These features provide both the identity layer and the security mechanisms required by the application.

---

## Live Chat

A **live chat** allows users to communicate directly within the platform.

Chat is part of the same user experience as the gaming and social features, creating a single environment for interaction between players.

---

## Statistics

The application includes **User & Game Statistics Dashboards** for presenting information related to player activity and game performance.

```text
User
 |
 +---- Games
 |      |
 |      +---- Results
 |      +---- Performance
 |
 +---- Activity
        |
        +---- Statistics
```

---

## Microservices

The backend follows a **microservices architecture**, separating application responsibilities into independent services.

This provides a clearer separation of concerns and makes the backend easier to reason about and extend.

---

# Architecture

The application can be represented at a high level as:

```text
                    ┌──────────────────────┐
                    │      Frontend        │
                    │ TypeScript + Tailwind│
                    └──────────┬───────────┘
                               │
                               v
                    ┌──────────────────────┐
                    │       Fastify        │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             v                 v                 v
       ┌───────────┐     ┌───────────┐     ┌───────────┐
       │   Auth    │     │   Users   │     │   Game    │
       └───────────┘     └───────────┘     └───────────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               v
                    ┌──────────────────────┐
                    │    Prisma ORM        │
                    └──────────┬───────────┘
                               v
                    ┌──────────────────────┐
                    │       SQLite         │
                    └──────────────────────┘
```

The main layers are:

| Layer | Technology | Role |
|---|---|---|
| Frontend | TypeScript / Tailwind CSS | User interface |
| Backend | Fastify | Server-side application |
| Architecture | Microservices | Separation of backend responsibilities |
| ORM | Prisma | Database access |
| Database | SQLite | Persistent data |

---

# Real-Time Experience

Real-time interaction is central to the platform.

The application brings together three particularly interactive components:

```text
                 REAL-TIME EXPERIENCE

              ┌───────────────────┐
              │       Users       │
              └─────────┬─────────┘
                        |
           ┌────────────┼────────────┐
           |            |            |
           v            v            v
       Pong Game     Live Chat   Remote Players
           |            |            |
           └────────────┼────────────┘
                        |
                        v
                 Shared Platform
```

This creates a consistent experience where gameplay, communication and player interaction coexist within the same application.

---

# 42 Modules

The project implements **7 Major modules and 3 Minor modules** from the ft_transcendence subject.

## Major Modules

| Module | Category | Implementation |
|---|---|---|
| **Fastify** | Web | Backend framework |
| **Standard User Management** | User Management | User and account management |
| **2FA + JWT** | Cybersecurity | Secure authentication |
| **Live Chat** | Gameplay & UX | Real-time communication |
| **Remote Players** | Gameplay & UX | Multiplayer gameplay |
| **Backend Microservices** | DevOps | Microservices architecture |
| **Remote Authentication** | User Management | OAuth 2.0 |

## Minor Modules

| Module | Category | Implementation |
|---|---|---|
| **Tailwind CSS** | Web | Frontend CSS toolkit |
| **SQLite + Prisma** | Web | Database + ORM |
| **User & Game Statistics** | AI-Algo | Statistics dashboards |

### Coverage

```text
MAJOR   7
MINOR   3
```

The subject allows two Minor modules to count as one Major module toward the overall module requirement.

---

# Security

Security is integrated into the application through multiple layers:

```text
                 Authentication
                       |
          ┌────────────┼────────────┐
          |            |            |
          v            v            v
         JWT          2FA        OAuth 2.0
          |            |            |
          └────────────┼────────────┘
                       v
                Secure User Access
```

The project also follows the subject's security requirements around password protection, input validation, protection against common web vulnerabilities and keeping sensitive configuration outside version control.

---

# Tech Stack

### Frontend

- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Fastify
- Microservices architecture

### Database

- SQLite
- Prisma ORM

### Authentication

- JWT
- Two-Factor Authentication
- OAuth 2.0

### Application

- Multiplayer Pong
- Remote Players
- Live Chat
- User Management
- Statistics Dashboards

### Infrastructure

- Docker

---

# Project Structure

```text
ft_transcendence/
│
├── frontend/
│
├── backend/
│   ├── services/
│   ├── authentication/
│   ├── users/
│   └── game/
│
├── prisma/
│   └── schema.prisma
│
├── database/
│
├── docker/
│
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

Adapt the directory names above to the actual repository structure if necessary.

---

# Installation

## Clone

```bash
git clone <repository-url>
cd ft_transcendence
```

## Environment

Create the local environment file:

```bash
cp .env.example .env
```

Configure the required environment variables.

Sensitive credentials, API keys and other secrets should not be committed to Git.

## Dependencies

```bash
npm install
```

## Database

Generate the Prisma client:

```bash
npx prisma generate
```

Apply the database migrations when required:

```bash
npx prisma migrate dev
```

## Docker

Build and start the application:

```bash
docker compose up --build
```

Stop the application:

```bash
docker compose down
```

---

# Screenshots

Visuals are intentionally kept as part of the project's documentation rather than filling the README with decorative elements.

Recommended screenshots:

### Dashboard

```md
![Dashboard](docs/screenshots/dashboard.png)
```

### Multiplayer Pong

```md
![Pong](docs/screenshots/pong.png)
```

### Live Chat

```md
![Live Chat](docs/screenshots/chat.png)
```

### Statistics

```md
![Statistics](docs/screenshots/statistics.png)
```

---

# What This Project Demonstrates

ft_transcendence brings together several areas of software engineering in a single application:

| Area | Experience |
|---|---|
| Full-Stack Development | Frontend + Backend |
| Backend Engineering | Fastify + Microservices |
| Database Design | SQLite + Prisma |
| Authentication | JWT + OAuth 2.0 |
| Cybersecurity | 2FA |
| Real-Time Systems | Multiplayer + Live Chat |
| UI Development | Tailwind CSS |
| Data Visualization | User & Game Statistics |
| Infrastructure | Docker |

---

# Project Takeaways

The main challenge of ft_transcendence is not implementing Pong in isolation.

It is integrating **gameplay, networking, authentication, user management, communication, persistence and security** into one coherent platform.

```text
                         USER
                          |
          ┌───────────────┼───────────────┐
          |               |               |
          v               v               v
       PLAY PONG        CHAT         MANAGE ACCOUNT
          |               |               |
          └───────────────┼───────────────┘
                          |
                          v
                    AUTHENTICATION
                          |
                    ┌─────┴─────┐
                    |           |
                   JWT         2FA
                    |
                 OAuth 2.0
                    |
                    v
                 BACKEND
                    |
                MICROservices
                    |
                    v
              PRISMA + SQLITE
```

The result is a complete multiplayer web platform that combines **full-stack development, real-time interaction, secure authentication and modular backend architecture**.
