# Contributing to Hotel Management Platform

Thank you for your interest in contributing to the Hotel Management Platform! This is a monorepo containing a Node.js Fastify backend and two React/Vite frontends.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Docker (optional, for local database)
- Supabase Account (or local setup)
- Firebase Project (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hotel-management.git
   cd hotel-management
   ```

2. **Install dependencies**
   ```bash
   # Root install
   npm install

   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../apps/booking && npm install
   cd ../apps/dashboard && npm install
   ```

## 🛠Environment Setup

You need to set up environment variables for each component. Copy the example files:

```bash
cp backend/.env.example backend/.env
cp apps/booking/.env.example apps/booking/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `development` or `production` |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical:** Service Role Key (keep secret!) |
| `FIREBASE_PROJECT_ID` | Firebase Project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Service Account Email |
| `FIREBASE_PRIVATE_KEY` | Service Account Private Key (handle newlines correctly) |
| `ALLOWED_ORIGINS` | Comma-separated allowed frontend URLs |

### Frontends (`apps/booking/.env` & `apps/dashboard/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL of your running backend (e.g., `http://localhost:3000/api/v1`) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |

## 📦 Database Setup

1. **Create tables**: Run the SQL script located in `database/schema.sql` in your Supabase SQL Editor.
2. **Seed data**: Run `database/seed.sql` to populate initial hotels and rooms.

## 🏃‍♂️ Running Locally

You can run all services simultaneously or individually.

### Run everything (Root)
```bash
npm run dev
```

### Run individually
```bash
# Backend
cd backend && npm run dev

# Booking App
cd apps/booking && npm run dev

# Dashboard
cd apps/dashboard && npm run dev
```

## 🤝 Contributing Guidelines

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
