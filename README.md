# Hela Pesa - Instant Mobile Loans Kenya

Hela Pesa is a premium, mobile-first PWA for instant loan disbursement in Kenya.

## 🚀 Deployment (Vercel)

1. **Push to GitHub**:
   ```bash
   git remote add origin YOUR_REPOSITORY_URL
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Create a new project on Vercel and import this repository.
   - Vercel will automatically detect Vite.

3. **Configure Environment Variables**:
   Under the Vercel project settings, add the following variables:
   - `PAYHERO_USERNAME`: Your PayHero username
   - `PAYHERO_PASSWORD`: Your PayHero password
   - `PAYHERO_CHANNEL_ID`: 6770
   - `CALLBACK_URL`: Your Vercel domain + `/api/payhero-callback` (e.g., `https://hela-pesa.vercel.app/api/payhero-callback`)

## 🛠 Features
- **PWA**: Installable on Android and iOS.
- **Biometric-style PIN Login**: Secure access to user dashboards.
- **PayHero Integration**: Real-time STK push for service fees.
- **Persistent Sessions**: Uses LocalStorage for seamless UX across refreshes.

## ⚠️ Important Note
This version uses a temporary file-based persistence (`/tmp/users.json`) on Vercel, which will be reset when the serverless function cold-starts. For production use, please connect a database like **Vercel Postgres** or **MongoDB**.
