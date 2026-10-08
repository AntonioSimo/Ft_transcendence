# ft_transcendence

<p align="center">
  <strong>A full-stack multiplayer Pong platform built around real-time gameplay, authentication, social interaction and a modular backend architecture.</strong>
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
  <a href="#security">Security</a>
  ·
  <a href="#installation">Installation</a>
</p>

---

## Overview

**ft_transcendence** is a full-stack web application developed as part of the 42 curriculum.

The project goes beyond implementing a simple Pong game. It combines **real-time multiplayer gameplay**, **user management**, **authentication**, **live communication**, **statistics**, and a **modular backend architecture** into a single web platform.

The goal was to build a complete application in which users can:

- create and manage their account;
- authenticate securely;
- enable two-factor authentication;
- play Pong against other players remotely;
- communicate through a live chat;
- participate in multiplayer experiences;
- access personal and game statistics;
- interact with a persistent database;
- use external authentication;
- communicate with a modular backend composed of independent services.

The project was designed around the principles of **modularity, security, real-time interaction and maintainability**.

---

## Highlights

<table>
<tr>
<td width="50%">

### Real-Time Multiplayer

Play Pong against remote players with a multiplayer architecture designed around live interaction.

</td>
<td width="50%">

### Secure Authentication

User authentication enhanced with JWT and two-factor authentication.

</td>
</tr>

<tr>
<td width="50%">

### Live Communication

A real-time chat system allowing users to communicate directly within the platform.

</td>
<td width="50%">

### Modular Backend

Backend functionality structured around microservices to separate application responsibilities.

</td>
</tr>

<tr>
<td width="50%">

### Persistent Data

SQLite database managed through Prisma for structured and maintainable data access.

</td>
<td width="50%">

### Statistics

Dedicated user and game statistics dashboards for tracking performance and activity.

</td>
</tr>
</table>

---

# Features

## Multiplayer Pong

The core of the platform is a multiplayer Pong experience.

The application supports remote gameplay, allowing users to play against other players rather than being limited to a local single-player experience.

The game system is integrated with the rest of the platform so that gameplay can coexist with:

- user accounts;
- matchmaking;
- tournaments;
- player interactions;
- game statistics;
- remote players.

The objective was not simply to reproduce Pong, but to integrate the game into a complete multiplayer web application.

---

## Remote Players

One of the implemented **Major modules** is the support for remote players.

Users can interact with players connected from different locations and participate in multiplayer games through the web application.

This required the application to handle gameplay as a shared real-time experience rather than as an isolated local game.

**42 Module**

> Gameplay & UX — Major: Remote players

---

## User Management

The platform includes a complete user management system.

Users are represented as persistent entities within the application and can interact with the other systems of the platform.

The user-management functionality covers the foundations required for:

- user accounts;
- authentication;
- player identity;
- interactions between users;
- tournament participation;
- game-related information.

**42 Module**

> User Management — Major: Standard user management

---

# Authentication

## JWT Authentication

Authentication is implemented using **JSON Web Tokens (JWT)**.

JWT provides the authentication mechanism used to maintain authenticated sessions between the frontend and backend.

The authentication layer is integrated with the rest of the user-management system.

---

## Two-Factor Authentication

The application also implements **Two-Factor Authentication (2FA)** as an additional security layer.

2FA requires an additional authentication factor beyond the standard login credentials, strengthening account protection.

**42 Module**

> Cybersecurity — Major: Implement 2FA and JWT

---

## Remote Authentication

Users can also authenticate through an external authentication mechanism based on **OAuth 2.0**.

This allows authentication to be delegated to an external identity provider instead of relying exclusively on locally managed credentials.

**42 Module**

> User Management — Major: Implement remote authentication

---

# Live Chat

The platform includes a **Live Chat** system designed for communication between users.

The chat is integrated into the application rather than being an isolated feature, allowing communication to coexist with the gaming and social aspects of the platform.

Users can use the chat as part of their interaction with the rest of the platform.

**42 Module**

> Gameplay & UX — Major: Live Chat

---

# Statistics

The application provides dedicated **User & Game Statistics Dashboards**.

These dashboards expose information related to users and their gameplay, allowing activity and game performance to be presented through a dedicated interface.

Statistics connect the different parts of the application:

```text
User
  |
  +---- Games
  |       |
  |       +---- Results
  |       +---- Performance
  |
  +---- Activity
          |
          +---- Statistics Dashboard
```

**42 Module**

> AI-Algo — Minor: User & Game Stats Dashboards

---

# Database

## SQLite + Prisma

The application uses **SQLite** as its relational database.

**Prisma** is used as the ORM and data-access layer, providing a structured way to define the application's data models and interact with the database.

The combination provides:

```text
Application
     |
     v
  Prisma ORM
     |
     v
   SQLite
```

This separation keeps database access structured and makes the application's data layer easier to maintain.

### Database Stack

| Technology | Role |
|---|---|
| SQLite | Relational database |
| Prisma | ORM / data-access layer |
| Prisma Schema | Data model definition |

**42 Module**

> Web — Minor: Use a database for the backend -and more

---

# Backend

## Fastify

The backend is built using **Fastify**.

Fastify provides the backend framework used to structure the server-side application and expose the required application functionality.

Using a dedicated backend framework also provides a clear separation between the frontend and backend layers.

**42 Module**

> Web — Major: Use a framework to build the backend

---

## Microservices

The backend is structured around a **microservices architecture**.

Instead of concentrating every responsibility inside a single monolithic backend, functionality can be separated into independent services.

Conceptually:

```text
                         ┌──────────────────┐
                         │     Frontend     │
                         └────────┬─────────┘
                                  │
                                  v
                         ┌──────────────────┐
                         │     Backend      │
                         │    Services      │
                         └────────┬─────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                v                 v                 v
          ┌──────────┐      ┌──────────┐      ┌──────────┐
          │   Auth   │      │  Users   │      │   Game   │
          └──────────┘      └──────────┘      └──────────┘
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  v
                         ┌──────────────────┐
                         │ SQLite + Prisma  │
                         └──────────────────┘
```

The exact service boundaries are intentionally implementation-specific, but the architecture follows the principle of separating backend responsibilities into independent components.

**42 Module**

> DevOps — Major: Backend as microservices

---

# Frontend

## Tailwind CSS

The frontend uses **Tailwind CSS** as its CSS framework/toolkit.

Tailwind allows the interface to be constructed through utility-based styling while keeping the visual system consistent throughout the application.

The frontend was designed with a focus on:

- clear navigation;
- responsive layouts;
- reusable visual patterns;
- consistent spacing and typography;
- game-oriented interfaces;
- dashboards;
- authentication screens;
- social interactions.

**42 Module**

> Web — Minor: Use a framework or toolkit to build the front-end

---

# Architecture

At a high level, the application can be represented as:

```text
                    ┌─────────────────────────────┐
                    │          CLIENT             │
                    │                             │
                    │  Web Application            │
                    │  Tailwind CSS               │
                    └──────────────┬──────────────┘
                                   │
                                   │ HTTP / Real-Time
                                   │
                    ┌──────────────v──────────────┐
                    │          BACKEND             │
                    │                             │
                    │          Fastify             │
                    │                             │
                    │       Microservices          │
                    └───────┬─────────┬────────────┘
                            │         │
              ┌─────────────┘         └─────────────┐
              │                                     │
              v                                     v
       ┌──────────────┐                      ┌──────────────┐
       │ Authentication│                      │    Game      │
       │     & Users   │                      │   Services   │
       └───────┬──────┘                      └───────┬──────┘
               │                                     │
               └────────────────┬────────────────────┘
                                v
                       ┌──────────────────┐
                       │ Prisma ORM       │
                       └────────┬─────────┘
                                v
                       ┌──────────────────┐
                       │      SQLite      │
                       └──────────────────┘
```

The architecture separates the main concerns of the application:

| Layer | Responsibility |
|---|---|
| Frontend | User interface and application interaction |
| Fastify | Backend framework |
| Microservices | Separation of backend responsibilities |
| Authentication | User identity and secure access |
| Game services | Multiplayer game functionality |
| Prisma | Database abstraction and data access |
| SQLite | Persistent relational data |

---

# Real-Time Application

Real-time interaction is one of the central characteristics of the project.

The platform combines several features that require users to interact with application state dynamically:

```text
                 REAL-TIME PLATFORM
                         |
        ┌────────────────┼────────────────┐
        |                |                |
        v                v                v
     Pong Game        Live Chat       Remote Players
        |                |                |
        └────────────────┼────────────────┘
                         |
                         v
                  User Experience
```

The real-time nature of the project becomes particularly important for multiplayer Pong and live communication.

---

# 42 Modules

The project implements the following modules from the **ft_transcendence** subject.

## Major Modules

### 1. Fastify

**Category:** Web

**Type:** Major

A backend framework is used to build the server-side application.

---

### 2. Standard User Management

**Category:** User Management

**Type:** Major

The application implements standard user management, including the user entities required throughout the platform.

---

### 3. 2FA + JWT

**Category:** Cybersecurity

**Type:** Major

Authentication is strengthened through JWT and Two-Factor Authentication.

---

### 4. Live Chat

**Category:** Gameplay & UX

**Type:** Major

A live communication system is available to users within the platform.

---

### 5. Remote Players

**Category:** Gameplay & UX

**Type:** Major

Players can participate in Pong games remotely.

---

### 6. Backend Microservices

**Category:** DevOps

**Type:** Major

The backend follows a microservices architecture.

---

### 7. Remote Authentication

**Category:** User Management

**Type:** Major

The project implements remote authentication using OAuth 2.0.

---

## Minor Modules

### 8. Tailwind CSS

**Category:** Web

**Type:** Minor

Tailwind CSS is used as the frontend CSS framework/toolkit.

---

### 9. SQLite + Prisma

**Category:** Web

**Type:** Minor

SQLite is used as the database, with Prisma providing the ORM and data-access layer.

---

### 10. User & Game Statistics

**Category:** AI-Algo

**Type:** Minor

Dedicated dashboards expose user and game statistics.

---

# Module Scorecard

| # | Implementation | Category | Type |
|---:|---|---|:---:|
| 01 | Fastify | Web | **Major** |
| 02 | Standard User Management | User Management | **Major** |
| 03 | 2FA + JWT | Cybersecurity | **Major** |
| 04 | Live Chat | Gameplay & UX | **Major** |
| 05 | Remote Players | Gameplay & UX | **Major** |
| 06 | Backend Microservices | DevOps | **Major** |
| 07 | Remote Authentication | User Management | **Major** |
| 08 | Tailwind CSS | Web | **Minor** |
| 09 | SQLite + Prisma | Web | **Minor** |
| 10 | User & Game Statistics | AI-Algo | **Minor** |

### Coverage

```text
MAJOR

Fastify                    ████████████████████
User Management            ████████████████████
2FA + JWT                  ████████████████████
Live Chat                  ████████████████████
Remote Players             ████████████████████
Microservices              ████████████████████
Remote Authentication      ████████████████████


MINOR

Tailwind CSS               ████████████████████
SQLite + Prisma            ████████████████████
User & Game Statistics     ████████████████████
```

The implementation therefore covers **7 Major modules and 3 Minor modules** from the subject.

According to the subject, **two Minor modules count as one Major module**, while the project requires at least **7 Major modules** for the 100% completion target.

---

# Security

Security is treated as a fundamental part of the application rather than as an isolated feature.

The project includes:

- JWT-based authentication;
- Two-Factor Authentication;
- OAuth 2.0 remote authentication;
- password protection;
- input validation;
- protection against common injection and scripting vulnerabilities;
- secure handling of authentication data;
- environment-based configuration for sensitive values.

Sensitive credentials, API keys and environment-specific configuration should remain outside version control.

Example:

```text
.env
```

should be excluded from Git through:

```text
.gitignore
```

---

# User Flow

A typical interaction with the platform can be represented as:

```text
                    ┌─────────────┐
                    │    Visit    │
                    │    App      │
                    └──────┬──────┘
                           │
                           v
                  ┌─────────────────┐
                  │ Authentication  │
                  └────────┬────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                  v                 v
             Local Login       OAuth 2.0
                  │                 │
                  └────────┬────────┘
                           v
                    ┌─────────────┐
                    │  Dashboard  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          v                v                v
       Play Pong         Chat          Statistics
          │                │                │
          └────────────────┼────────────────┘
                           v
                    ┌─────────────┐
                    │    User     │
                    │ Experience  │
                    └─────────────┘
```

---

# Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| TypeScript | Frontend development |
| Tailwind CSS | Styling and UI toolkit |

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Server-side runtime |
| Fastify | Backend framework |
| Microservices | Backend architecture |

## Database

| Technology | Purpose |
|---|---|
| SQLite | Relational database |
| Prisma | ORM and database access |

## Authentication

| Technology | Purpose |
|---|---|
| JWT | Authentication |
| 2FA | Additional account security |
| OAuth 2.0 | Remote authentication |

## Application Features

| Feature | Purpose |
|---|---|
| Pong | Multiplayer gameplay |
| Remote Players | Online multiplayer |
| Live Chat | User communication |
| Statistics | User and game analysis |
| User Management | Account and player management |

---

# Project Structure

A conceptual representation of the project is:

```text
ft_transcendence/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── ...
│
├── backend/
│   ├── services/
│   ├── authentication/
│   ├── users/
│   ├── game/
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── ...
│
├── database/
│   └── ...
│
├── docker/
│   └── ...
│
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

> The structure above represents the architectural organization of the application. Adapt the directory names to the actual repository structure if your implementation uses different paths.

---

# Installation

## Requirements

Before running the project, make sure the required development environment is available.

Typical requirements include:

- Node.js
- npm
- Docker
- Docker Compose
- Git

---

## Clone the Repository

```bash
git clone <repository-url>
cd ft_transcendence
```

---

## Environment Configuration

Create the local environment configuration from the provided example:

```bash
cp .env.example .env
```

Then configure the required environment variables.

Do not commit secrets, credentials or API keys to the repository.

---

## Install Dependencies

```bash
npm install
```

If the repository is organized into separate frontend and backend packages, install the dependencies according to the corresponding package configuration.

---

## Database

The project uses **SQLite + Prisma**.

After configuring the environment, initialize the Prisma database according to the project's Prisma configuration.

Typical Prisma commands may include:

```bash
npx prisma generate
```

and, when required by the project:

```bash
npx prisma migrate dev
```

---

## Run with Docker

The project is designed to be containerized.

Start the application with:

```bash
docker compose up --build
```

To stop the services:

```bash
docker compose down
```

---

# Development

For development, the application can be started through the scripts defined in the project's package configuration.

For example:

```bash
npm run dev
```

Check the repository's `package.json` for the exact scripts available in the implementation.

---

# Screenshots

## Dashboard

Add a screenshot of the main dashboard here.

```text
docs/screenshots/dashboard.png
```

Example Markdown:

```md
![Dashboard](docs/screenshots/dashboard.png)
```

---

## Pong

Add a screenshot of the multiplayer Pong experience here.

```text
docs/screenshots/pong.png
```

```md
![Pong](docs/screenshots/pong.png)
```

---

## Live Chat

Add a screenshot of the live chat here.

```text
docs/screenshots/chat.png
```

```md
![Live Chat](docs/screenshots/chat.png)
```

---

## Statistics

Add a screenshot of the statistics dashboard here.

```text
docs/screenshots/statistics.png
```

```md
![Statistics](docs/screenshots/statistics.png)
```

---

# Design Philosophy

The project was developed around four main principles.

### Modularity

Separate application responsibilities into clear components and services.

### Security

Authentication, authorization and user data protection are treated as core application requirements.

### Real-Time Interaction

Gameplay and communication are designed around interactions that happen dynamically between users.

### Maintainability

The codebase is structured to make individual parts of the application easier to understand, modify and extend.

---

# What This Project Demonstrates

This project brings together several areas of modern web development:

```text
                 ft_transcendence
                        |
        ┌───────────────┼────────────────┐
        │               │                │
        v               v                v
     FRONTEND        BACKEND          DATABASE
        │               │                │
   Tailwind CSS      Fastify        SQLite + Prisma
        │               │                │
        └───────────────┼────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              v                   v
        AUTHENTICATION        REAL-TIME
              │                   │
          JWT / 2FA          Pong / Chat
              │                   │
              └─────────┬─────────┘
                        v
                  USER EXPERIENCE
```

The resulting application demonstrates experience with:

- full-stack web development;
- backend architecture;
- frontend development;
- relational databases;
- ORM-based data access;
- authentication;
- cybersecurity;
- real-time multiplayer systems;
- social features;
- microservices;
- containerization;
- statistics and dashboards.

---

# Why This Project Stands Out

ft_transcendence is not only a Pong implementation.

It is a complete web platform where multiple technical domains have to work together:

```text
             GAME
              |
              v
        Multiplayer
              |
              v
        Real-Time Layer
              |
       ┌──────┴──────┐
       v             v
     Chat          Players
       |             |
       └──────┬──────┘
              v
          User System
              |
       ┌──────┴──────┐
       v             v
 Authentication   Statistics
       |
   ┌───┴────┐
   v        v
  JWT      2FA
   |
 OAuth 2.0
              |
              v
        Backend Services
              |
          Fastify
              |
           Prisma
              |
           SQLite
```

The main challenge is therefore not implementing an individual feature, but integrating the different systems into a coherent application.

---

# Technical Summary

| Area | Implementation |
|---|---|
| Application | Full-stack multiplayer web platform |
| Game | Multiplayer Pong |
| Backend | Node.js + Fastify |
| Architecture | Microservices |
| Frontend | TypeScript + Tailwind CSS |
| Database | SQLite |
| ORM | Prisma |
| Authentication | JWT |
| Security | 2FA |
| Remote Authentication | OAuth 2.0 |
| Communication | Live Chat |
| Multiplayer | Remote Players |
| Analytics | User & Game Statistics |
| Deployment | Docker |

---

# 42 Evaluation Coverage

```text
WEB
├── Major  ── Fastify
├── Minor  ── Tailwind CSS
└── Minor  ── SQLite + Prisma

USER MANAGEMENT
├── Major  ── Standard User Management
└── Major  ── Remote Authentication

GAMEPLAY & UX
├── Major  ── Remote Players
└── Major  ── Live Chat

CYBERSECURITY
└── Major  ── 2FA + JWT

DEVOPS
└── Major  ── Backend Microservices

AI-ALGO
└── Minor  ── User & Game Statistics
```

---

# Final Scorecard

**7 Major Modules**

```text
01  Fastify
02  Standard User Management
03  2FA + JWT
04  Live Chat
05  Remote Players
06  Backend Microservices
07  Remote Authentication
```

**3 Minor Modules**

```text
01  Tailwind CSS
02  SQLite + Prisma
03  User & Game Statistics
```

**Total: 7 Major + 3 Minor**

---

# Contributors

Developed as part of the **42 ft_transcendence** project.

```text
42 Network
ft_transcendence
Full-Stack Web Application
```

---

# License

This project was developed for educational purposes as part of the 42 curriculum.

The original project subject and evaluation criteria belong to **42**.