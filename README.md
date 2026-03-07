# ForgeAI — Spatial Intelligence OS for Product Managers

ForgeAI is the first Spatial Intelligence OS designed specifically for Product Managers. It transforms the way product teams move from messy discovery to structured execution on an infinite collaborative canvas.

## 🚀 The Mission

Product management is often trapped in linear documents (Notion, Google Docs) and rigid ticket systems (Jira). These tools strip away context. ForgeAI brings discovery, brainstorming, and execution into a single spatial environment where context lives right alongside the work.

## ✨ Key Features

- **Infinite Spatial Canvas**: Map out user journeys, drop in research, wireframes, and PRDs side-by-side. See the whole product narrative at a glance.
- **Always-On Agent Panel**: An AI co-pilot that lives next to your canvas. Ask it to summarize research, draft PRDs from diagrams, or synthesize feedback into feature specs.
- **Visual Synthesis**: Select clusters of information on the canvas and let AI extract core problems, user stories, or edge cases.
- **Structured Output**: Automatically turn visual thinking into the rigorous PRDs and technical specs required by engineering teams.

## 🛠 Tech Stack

This project is a monorepo managed by [Turborepo](https://turborepo.org/).

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Authentication**: [Better-Auth](https://better-auth.com/) (Email/Password + Google OAuth)
- **Database**: [Prisma](https://www.prisma.io/) with PostgreSQL
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Canvas Engine**: [tldraw](https://tldraw.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Motion](https://motion.dev/)
- **Real-time**: [Liveblocks](https://liveblocks.io/)

## 📦 Project Structure

```
.
├── apps
│   ├── web          # Main Next.js application
│   └── docs         # Documentation site (Next.js)
├── packages
│   ├── db           # Shared Prisma client and schema
│   ├── ui           # Shared React component library
│   ├── eslint-config
│   └── typescript-config
```

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up your environment variables in `apps/web/.env`:
   ```env
   DATABASE_URL="your-postgresql-url"
   BETTER_AUTH_SECRET="your-secret"
   NEXT_PUBLIC_APP_URL="http://localhost:4000"
   GOOGLE_CLIENT_ID="your-google-id"
   GOOGLE_CLIENT_SECRET="your-google-secret"
   ```
4. Push the database schema:
   ```sh
   npx turbo db:push
   ```

### Development

To start all apps in development mode:

```sh
npm run dev
```

The web app will be available at `http://localhost:4000`.

## 🏗 Build

To build all apps and packages:

```sh
npm run build
```

## 📄 License

© {new Date().getFullYear()} ForgeAI. All rights reserved.
