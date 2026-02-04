# Deployment Guide: Bingo Royale

Follow these steps to deploy **Bingo Royale** to production using Vercel (Frontend) and Convex (Backend).

## 1. Backend Deployment (Convex)

1.  **Login to Convex**: 
    Run `npx convex login` in your terminal.
2.  **Create Production Project**: 
    Visit the [Convex Dashboard](https://dashboard.convex.dev/) and create a new project named `bingo-royale`.
3.  **Deploy Functions**: 
    Run `npx convex deploy` to push your schema and functions to the production environment.
4.  **Get Deployment URL**: 
    Keep note of your **Production Convex URL** (e.g., `https://happy-otter-123.convex.cloud`).

## 2. Frontend Deployment (Vercel)

1.  **Connect GitHub**: 
    Push your code to a GitHub repository and connect it to Vercel.
2.  **Configure Environment Variables**: 
    In the Vercel dashboard, add the following Environment Variable:
    -   `VITE_CONVEX_URL`: Your **Production Convex URL**.
3.  **Build Settings**:
    -   Framework: `Vite`
    -   Build Command: `npm run build`
    -   Output Directory: `dist`
4.  **Deploy**: 
    Click **Deploy**.

## 3. Post-Deployment Checklist

- [ ] Verify PWA performance using Lighthouse in Chrome DevTools.
- [ ] Check OpenGraph tags using [opengraph.xyz](https://www.opengraph.xyz/).
- [ ] Ensure `VITE_CONVEX_URL` is correctly set in production.
- [ ] Test the "Daily Reward" claim loop on the live site.

## Scaling & Monitoring

- **Convex Dashboard**: Monitor function execution times and database growth.
- **Log Streaming**: Connect Convex logs to Datadog or Logflare for production monitoring if traffic scales.
