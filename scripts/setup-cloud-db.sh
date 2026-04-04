#!/bin/bash
# ============================================================
# Prime Pet Leads — Cloud Database Setup Script
# ============================================================
# This script connects your app to a Supabase Cloud database
# and pushes the Prisma schema to create all required tables.
#
# BEFORE RUNNING THIS SCRIPT:
# 1. Go to https://supabase.com/dashboard
# 2. Open your project
# 3. If you see a "Restore" button, click it and wait for it to finish
# 4. Go to Project Settings > Database
# 5. Copy the connection string (URI format)
# ============================================================

set -e

echo "=========================================="
echo "  Prime Pet Leads - Cloud DB Setup"
echo "=========================================="
echo ""

# ---- Step 1: Get connection info from user ----
echo "Go to your Supabase Dashboard:"
echo "  https://supabase.com/dashboard"
echo ""
echo "Navigate to: Project Settings > Database > Connection string (URI)"
echo ""
read -p "Paste your DATABASE_URL (postgresql://...): " DB_URL

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: No connection string provided. Exiting."
  exit 1
fi

# ---- Step 2: Test the connection ----
echo ""
echo "Testing connection..."
DATABASE_URL="$DB_URL" npx prisma db execute --stdin <<< "SELECT 1;" 2>&1 && {
  echo "✅ Connection successful!"
} || {
  echo ""
  echo "❌ Connection failed. Common issues:"
  echo "  1. Project might be paused — go to dashboard and click 'Restore'"
  echo "  2. Password contains special chars — make sure they are URL-encoded"
  echo "     @ → %40   # → %23   ? → %3F   & → %26   = → %3D"
  echo "  3. Wrong region in pooler URL — check your dashboard for correct region"
  echo ""
  read -p "Try pushing schema anyway? (y/N): " FORCE
  if [[ "$FORCE" != "y" && "$FORCE" != "Y" ]]; then
    exit 1
  fi
}

# ---- Step 3: Push Prisma schema ----
echo ""
echo "Pushing Prisma schema to cloud database..."
DATABASE_URL="$DB_URL" npx prisma db push

echo ""
echo "✅ Database tables created successfully!"

# ---- Step 4: Get Supabase API credentials ----
echo ""
echo "Now go to: Project Settings > API"
echo ""
read -p "Paste your NEXT_PUBLIC_SUPABASE_URL (https://xxx.supabase.co): " SUPA_URL
read -p "Paste your NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPA_ANON_KEY

# ---- Step 4.5: Get remaining API keys ----
echo ""
read -p "Paste your FOURSQUARE_API_KEY: " FSQ_KEY
read -p "Paste your OPENAI_API_KEY: " OAI_KEY

# ---- Step 5: Create .env.cloud ----
cat > .env.cloud <<EOF
# ============================================================
# Cloud Environment — Copy these to Vercel Environment Variables
# ============================================================

# Prisma — Supabase Cloud Postgres
DATABASE_URL="$DB_URL"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPA_ANON_KEY

# Foursquare Places API
FOURSQUARE_API_KEY=$FSQ_KEY

# OpenAI
OPENAI_API_KEY=$OAI_KEY
EOF

echo ""
echo "✅ .env.cloud created with all credentials"

# ---- Step 6: Vercel instructions ----
echo ""
echo "=========================================="
echo "  FINAL STEP: Set Vercel Environment Vars"
echo "=========================================="
echo ""
echo "Go to: https://vercel.com/dashboard"
echo "  → Your Project → Settings → Environment Variables"
echo ""
echo "Add these variables for Production:"
echo ""
echo "  DATABASE_URL           = (your connection string)"
echo "  NEXT_PUBLIC_SUPABASE_URL = $SUPA_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY = $SUPA_ANON_KEY"
echo "  FOURSQUARE_API_KEY     = (already set if done earlier)"
echo "  OPENAI_API_KEY         = (already set if done earlier)"
echo ""
echo "Then redeploy: Deployments → ··· → Redeploy"
echo ""
echo "🎉 Done! Your app should be fully functional."
