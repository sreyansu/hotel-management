# 🚀 Deployment Guide

This guide covers deploying the Hotel Management Platform with **Supabase** for backend services and **Netlify/Vercel** for frontend hosting.

## 🏗 Architecture

| Component | Platform | Description |
|-----------|----------|-------------|
| **Database** | Supabase | PostgreSQL with Row Level Security |
| **Auth** | Supabase Auth | Email/Password + Google OAuth |
| **Edge Functions** | Supabase | Booking, Payments (Razorpay) |
| **Frontend Apps** | Netlify/Vercel | React + Vite SPAs |

---

## 1. Supabase Setup

### A. Database & Auth

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema SQL in SQL Editor (`database/schema.sql`)
3. Run the auth setup SQL (`database/supabase-auth-setup.sql`)
4. Enable providers in **Authentication → Providers**:
   - Email (with "Confirm email" enabled)
   - Google (add OAuth credentials)

### B. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy create-booking
supabase functions deploy razorpay-create-order
supabase functions deploy razorpay-verify
```

### C. Set Secrets

```bash
# Razorpay credentials
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_secret_key
```

---

## 2. Frontend Deployment (Netlify)

### A. Consumer Booking App (`apps/booking`)

1. **New Site from Git** in Netlify
2. **Build Settings**:
   - Base directory: `apps/booking`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment Variables**:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### B. Admin Dashboard (`apps/dashboard`)

1. **New Site from Git** (same repo)
2. **Build Settings**:
   - Base directory: `apps/dashboard`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment Variables**: Same as booking app

---

## 3. Razorpay Setup

1. Create account at [razorpay.com](https://razorpay.com)
2. Get API keys from **Settings → API Keys**
3. Add keys to Supabase secrets (see above)
4. Configure webhook URL (optional):
   ```
   https://your-project.supabase.co/functions/v1/razorpay-webhook
   ```

### Supported Payment Methods
- UPI (Google Pay, PhonePe, Paytm, BHIM)
- Credit/Debit Cards (Visa, Mastercard, Rupay)
- Net Banking (50+ banks)
- Wallets (Paytm, Mobikwik, etc.)
- EMI & Pay Later options

---

## 4. Post-Deployment Checklist

- [ ] Run database schema and seed data
- [ ] Enable email verification in Supabase
- [ ] Configure Google OAuth redirect URLs
- [ ] Deploy Edge Functions
- [ ] Set Razorpay secrets
- [ ] Deploy frontend apps
- [ ] Test user registration/login
- [ ] Test booking + payment flow

---

## Environment Variables Summary

### Supabase Edge Functions (Secrets)
```bash
RAZORPAY_KEY_ID=rzp_xxxxx
RAZORPAY_KEY_SECRET=your_secret
```

### Frontend Apps (.env)
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Auth not working | Check Supabase Auth settings, enable email provider |
| Google login fails | Verify OAuth redirect URLs in Google Console |
| Payment fails | Check Razorpay secrets, verify API keys are live/test |
| Edge Function 500 | Check Supabase logs: `supabase functions logs` |
| CORS errors | Edge functions include CORS headers by default |

---

## Legacy Backend (Optional)

The `backend/` folder contains the original Fastify server. It's **no longer required** since all functionality has been migrated to Supabase Auth + Edge Functions. You can archive or delete it.
