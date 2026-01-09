# Grand Palace Hotels - Management Platform

A production-ready hotel management and booking platform with a consumer booking website and an internal management dashboard.

## 🏨 Overview

This platform enables a hotel company to manage multiple properties with features including:

- **Dynamic Pricing Engine** - Seasonal rates, occupancy-based pricing, day-type modifiers
- **QR Payment System** - 5-minute payment sessions with UPI QR code generation
- **Role-Based Access Control** - 7 role hierarchy from Super Admin to Customer
- **Multi-Hotel Support** - Hotel-level data isolation and staff assignment
- **Real-time Status** - Room status, booking lifecycle, housekeeping logs

## 📁 Project Structure

```
hotel/
├── database/
│   ├── schema.sql          # PostgreSQL database schema
│   └── seed.sql            # Sample data for development
├── backend/
│   └── src/
│       ├── config/         # Environment, database, Firebase
│       ├── middlewares/    # Auth, RBAC, error handling
│       ├── services/       # Pricing, coupon, payment, booking, hotel
│       ├── routes/         # API endpoints
│       └── server.ts       # Fastify server entry
├── apps/
│   ├── booking/            # Consumer booking website
│   │   └── src/
│   │       ├── pages/      # Home, Hotel, Booking, Payment, etc.
│   │       ├── components/ # Layout, UI components
│   │       ├── lib/        # Firebase, API client
│   │       └── store/      # Zustand state
│   └── dashboard/          # Hotel management dashboard
│       └── src/
│           ├── pages/      # Dashboard, Bookings, Rooms, Staff, Reports
│           ├── components/ # DashboardLayout
│           ├── lib/        # Firebase, API client
│           └── store/      # Auth, hotel selection
```

## 🚀 Tech Stack

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL (Supabase) |
| Backend | Node.js + Fastify + TypeScript |
| Authentication | Firebase Auth |
| Consumer Frontend | React + Vite + TypeScript + Tailwind |
| Admin Dashboard | React + Vite + TypeScript + Tailwind + Recharts |
| State Management | Zustand + React Query |

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- Firebase project with Authentication enabled

### 1. Database Setup

```bash
# Create database in Supabase or local PostgreSQL
# Run schema
psql -d your_database -f database/schema.sql

# (Optional) Load seed data
psql -d your_database -f database/seed.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# - FIREBASE_PROJECT_ID, credentials path
# - UPI_MERCHANT_ID, UPI_MERCHANT_NAME

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`

### 3. Consumer Booking App

```bash
cd apps/booking

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with Firebase config

# Start development server
npm run dev
```

Available at `http://localhost:5173`

### 4. Management Dashboard

```bash
cd apps/dashboard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with Firebase config

# Start development server
npm run dev
```

Available at `http://localhost:5174`

## 👥 Role Hierarchy

| Role | Capabilities |
|------|--------------|
| SUPER_ADMIN | All hotels, all features |
| HOTEL_ADMIN | Single hotel, full control |
| DUTY_MANAGER | Bookings, pricing, reports |
| RECEPTION | Check-in/out, room status |
| HOUSEKEEPING | Room status only |
| ACCOUNTS | View reports, verify payments |
| CUSTOMER | Book rooms, view own bookings |

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/sync` - Sync Firebase user to database
- `GET /api/v1/auth/me` - Get current user profile

### Hotels
- `GET /api/v1/hotels` - List all hotels
- `GET /api/v1/hotels/:id` - Get hotel details
- `GET /api/v1/hotels/:id/room-types` - Get room types with availability
- `GET /api/v1/hotels/:id/rooms` - Get rooms (staff only)

### Bookings
- `POST /api/v1/bookings/calculate-price` - Calculate booking price
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings/:id` - Get booking details
- `PUT /api/v1/bookings/:id/check-in` - Check in guest
- `PUT /api/v1/bookings/:id/check-out` - Check out guest
- `POST /api/v1/bookings/:id/payment-session` - Create QR payment

### Management
- `GET /api/v1/coupons/hotel/:id` - Get hotel coupons
- `POST /api/v1/coupons` - Create coupon
- `GET /api/v1/staff/hotel/:id` - Get hotel staff
- `POST /api/v1/staff/hotel/:id` - Add staff member
- `GET /api/v1/reports/hotel/:id/occupancy` - Occupancy report
- `GET /api/v1/reports/hotel/:id/revenue` - Revenue report

## 🎨 Features

### Consumer Booking App
- Hotel browsing with search
- Room selection with availability
- Dynamic pricing display
- Coupon code application
- QR code payment with 5-minute timer
- Booking confirmation
- User dashboard with booking history

### Management Dashboard
- Overview with today's arrivals/departures
- Booking management with check-in/out
- Visual room status grid by floor
- Coupon creation and management
- Staff management with role assignment
- Analytics with occupancy and revenue charts

## 🔒 Security Features

- Firebase token verification on all protected routes
- Role-based middleware (RBAC)
- Hotel-level data isolation
- Soft deletes for data preservation
- Audit logging for sensitive operations
- Row Level Security in database

## 📝 Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
UPI_MERCHANT_ID=merchant@upi
UPI_MERCHANT_NAME=Grand Palace Hotels
TAX_RATE=0.18
PAYMENT_SESSION_EXPIRY_MINUTES=5
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Frontend Apps (.env)
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## 📄 License

MIT License
