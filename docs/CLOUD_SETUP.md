# Cloud Database Setup Guide

Your deployed app at **https://prime-pet-food-lead.vercel.app** needs a cloud Supabase database. The direct database host (`db.yhitrkemunizxuqhettl.supabase.co`) is currently unreachable, and the pooler returns "Tenant or user not found" across all regions. This usually means the database is **paused** or needs to be **restored**.

---

## Step 1: Restore Your Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your project
3. **If you see a "Restore" or "Resume" button** → Click it and wait (takes 1-2 minutes)
4. The database status should show as **Active/Healthy**

> **Free tier projects auto-pause after 7 days of inactivity.** Even if the API gateway responds, the database itself may be offline.

---

## Step 2: Get Your Connection String

1. Go to **Project Settings** → **Database**
2. Under **Connection string**, select **URI** format
3. Choose **Session mode** (port 5432) — this is required for Prisma schema push
4. Copy the full connection string

It will look like:
```
postgresql://postgres.yhitrkemunizxuqhettl:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**Important:** If your password contains `@`, replace it with `%40` in the URL.

---

## Step 3: Push the Schema

### Option A: Use the setup script (recommended)
```bash
cd ~/prime-pet-leads
./scripts/setup-cloud-db.sh
```

### Option B: Manual
```bash
cd ~/prime-pet-leads
DATABASE_URL='postgresql://postgres.yhitrkemunizxuqhettl:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres' npx prisma db push
```

---

## Step 4: Set Vercel Environment Variables

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → **Settings** → **Environment Variables**

Add these for **Production**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string (from Step 2) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yhitrkemunizxuqhettl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Project Settings → API → `anon` `public` key |
| `FOURSQUARE_API_KEY` | Your Foursquare API key |
| `OPENAI_API_KEY` | Your OpenAI key |

---

## Step 5: Redeploy

In Vercel Dashboard → **Deployments** → Click `···` on the latest → **Redeploy**

---

## Troubleshooting

### "Tenant or user not found"
- The database is paused. Go to the dashboard and restore it.

### "Can't reach database server at db.xxx.supabase.co"
- Use the **pooler** connection string instead of the direct one.
- For Prisma: use **Session mode** (port 5432).

### "password authentication failed"
- Double-check the password in the Supabase dashboard (Project Settings → Database → Database password).
- URL-encode special characters: `@` → `%40`, `#` → `%23`.

### Schema push works but app still fails
- Make sure you set `DATABASE_URL` in **Vercel** environment variables (not just locally).
- Use the **Transaction mode** pooler (port 6543) for the Vercel `DATABASE_URL` since the app uses connection pooling at runtime.
- Redeploy after setting env vars.
