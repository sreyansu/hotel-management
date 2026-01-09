# Netlify Deployment Guide

## Overview

This monorepo deploys as **3 separate Netlify sites**:

| App | Directory | Deploy Type |
|-----|-----------|-------------|
| Consumer Booking | `apps/booking` | Static Site |
| Admin Dashboard | `apps/dashboard` | Static Site |
| Backend API | `backend` | Netlify Functions |

---

## Step 1: Push to GitHub

First, push your code to GitHub:

```bash
cd /Users/sreyansusekharmohanty/hotel
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hotel.git
git push -u origin main
```

---

## Step 2: Deploy Backend API

1. Go to [netlify.com](https://netlify.com) → Add new site → Import existing project
2. Select your GitHub repo
3. Configure:
   - **Base directory:** `backend`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`

4. Add Environment Variables:
   ```
   SUPABASE_URL=https://qbmqwgptxvfhqyxdzzkt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   FIREBASE_PROJECT_ID=hotel-management-32f3f
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@hotel-management-32f3f.iam.gserviceaccount.com
   GST_PERCENTAGE=18
   UPI_MERCHANT_ID=sreyansu90-1@okhdfcbank
   UPI_MERCHANT_NAME=Sreyansu Sekhar Mohanty
   ```

5. Deploy!

Your API will be at: `https://YOUR-SITE.netlify.app/api/v1/hotels`

---

## Step 3: Deploy Consumer Booking App

1. Create **new** Netlify site (Add new site → Import existing project)
2. Select same GitHub repo
3. Configure:
   - **Base directory:** `apps/booking`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`

4. Add Environment Variables:
   ```
   VITE_API_URL=https://YOUR-BACKEND-SITE.netlify.app/api/v1
   VITE_FIREBASE_API_KEY=AIzaSyCU7X0MJxPnfox4vHf_968XOs02gaXhhu8
   VITE_FIREBASE_AUTH_DOMAIN=hotel-management-32f3f.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=hotel-management-32f3f
   ```

5. Deploy!

---

## Step 4: Deploy Admin Dashboard

1. Create **another new** Netlify site
2. Select same GitHub repo
3. Configure:
   - **Base directory:** `apps/dashboard`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`

4. Add same environment variables as booking app

5. Deploy!

---

## API Endpoints

Once deployed, your API endpoints will be:

| Endpoint | URL |
|----------|-----|
| Hotels List | `https://your-backend.netlify.app/api/v1/hotels` |
| Hotel by Slug | `https://your-backend.netlify.app/api/v1/hotels/slug/{slug}` |
| Room Types | `https://your-backend.netlify.app/api/v1/hotels/{id}/room-types` |
| Calculate Price | `POST https://your-backend.netlify.app/api/v1/bookings/calculate-price` |
| Create Booking | `POST https://your-backend.netlify.app/api/v1/bookings` |
| Auth Sync | `POST https://your-backend.netlify.app/api/v1/auth/sync` |
| Validate Coupon | `POST https://your-backend.netlify.app/api/v1/coupons/validate` |

---

## Custom Domains (Optional)

In Netlify Dashboard → Site settings → Domain management:
- Backend: `api.yourdomain.com`
- Booking: `book.yourdomain.com`
- Dashboard: `admin.yourdomain.com`

---

## Troubleshooting

**CORS Issues:**
Make sure your API allows requests from your frontend domains.

**Firebase Auth:**
Ensure your Firebase project has the Netlify domains authorized:
1. Go to Firebase Console → Authentication → Settings
2. Add your Netlify domains to "Authorized domains"

**Environment Variables:**
Double-check all env vars are set correctly. The `FIREBASE_PRIVATE_KEY` must have `\n` for newlines.
