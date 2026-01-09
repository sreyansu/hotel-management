# 🚀 Deployment Guide (Railway + Netlify)

This guide describes the recommended deployment architecture for the Hotel Management Platform. This "Hybrid" approach is robust, scalable, and easy to manage.

## 🏗 Architecture

- **Backend (Node.js/Fastify):** Deployed on **Railway** (or Render). Ideally suited for long-running Node.js processes.
- **Frontends (React/Vite):** Deployed on **Netlify**. Ideally suited for static sites and SPAs.
- **Database:** Supabase (PostgreSQL).

---

## 1. Backend Deployment (Render)

We recommend **Render** for the backend as it offers a free tier and easy setup for Node.js services.

### Steps:

1.  **Sign up/Login** to [Render](https://render.com/).
2.  **New click** > **Web Service**.
3.  **Connect GitHub** and select your repository (`hotel-management`).
4.  **Configure Service**:
    -   **Name:** `hotel-backend` (or similar)
    -   **Root Directory:** `backend`
    -   **Environment:** `Node`
    -   **Build Command:** `npm install && npm run build`
    -   **Start Command:** `npm start`
5.  **Environment Variables**:
    -   Go to **Environment** tab.
    -   Add all variables from your `backend/.env` file.
    -   **CRITICAL:** For `FIREBASE_PRIVATE_KEY`, if you have issues with newlines, try wrapping the entire key in double quotes or replacing newlines with `\n` literal. Render usually handles the raw copy-paste well.
6.  **Deploy Web Service**.
7.  **Copy the URL** (e.g., `https://hotel-backend.onrender.com`). You will need this for the frontend.

---

## 2. Frontend Deployment (Netlify)

This repository contains **two** frontend applications. You need to create **two separate sites** on Netlify, linked to the same GitHub repository.

### A. Consumer Booking App (`apps/booking`)

1.  **New Site from Git** in Netlify.
2.  Select the **same repository**.
3.  **Build Settings**:
    -   **Base directory:** `apps/booking`
    -   **Build command:** `npm run build`
    -   **Publish directory:** `dist`
4.  **Environment Variables**:
    -   `VITE_API_URL`: **Paste your Railway Backend URL here** (e.g., `https://hotel-backend-production.up.railway.app/api/v1`). **IMPORTANT:** Append `/api/v1` to the end.
    -   Add your Firebase variables (`VITE_FIREBASE_API_KEY`, etc.).
5.  **Deploy Site**.

### B. Admin Dashboard (`apps/dashboard`)

1.  **New Site from Git** in Netlify (repeat the process).
2.  Select the **same repository**.
3.  **Build Settings**:
    -   **Base directory:** `apps/dashboard`
    -   **Build command:** `npm run build`
    -   **Publish directory:** `dist`
4.  **Environment Variables**:
    -   `VITE_API_URL`: **Paste your Railway Backend URL here** (e.g., `https://hotel-backend-production.up.railway.app/api/v1`).
    -   Add your Firebase variables.
5.  **Deploy Site**.

---

## 3. Post-Deployment Verification

1.  **Backend Health:** Visit `https://<YOUR_BACKEND_URL>/health`. You should see `{"status":"ok"}`.
2.  **Frontend Connectivity:** Open your Booking App. Check the Console (F12). It should log the connected API URL. Try to search for hotels.
3.  **Authentication:** Try to Sign Up/Login. If it fails:
    -   Check backend logs in Railway.
    -   Check frontend console for errors.
    -   Verify `FIREBASE_PRIVATE_KEY` in Railway variables.

## 🌟 Open Source Setup

If you are making this public:
1.  Ensure no `.env` files are committed (checked `gitignore`, looks good).
2.  The `CONTRIBUTING.md` file (added) guides new users.
3.  Users will need their own Supabase and Firebase projects.
