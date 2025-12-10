# Travel Bids - Setup Instructions

## Phase 1 Progress ✅

- [x] Next.js 14+ initialized with TypeScript & App Router
- [x] Core dependencies installed (Prisma, PostHog, TanStack Query, Supabase)
- [x] Project structure created
- [x] Providers configured (Query, PostHog, tracking)
- [ ] Supabase project setup (YOU NEED TO DO THIS)
- [ ] Database deployed
- [ ] Features implementation

---

## Required Setup Steps

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name:** travel-bids
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to your users
4. Wait for project to provision (~2 minutes)

### 2. Get Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these values:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGc...
service_role key: eyJhbGc... (⚠️ NEVER commit this!)
```

### 3. Get Database URL

1. In Supabase dashboard, go to **Project Settings → Database**
2. Scroll to **Connection String**
3. Select **URI** tab
4. Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@...`)
5. Replace `[YOUR-PASSWORD]` with your actual database password

### 4. Update Environment Variables

Edit `.env.local` and replace the placeholder values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key_here

# Database (from Supabase → Project Settings → Database)
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres

# PostHog Analytics (optional for now - get from https://app.posthog.com)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Google Analytics 4 (optional - Phase 1 later)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Deploy Database Schema

Once your `.env.local` is configured:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase database
npx prisma db push

# Seed with sample data (optional - we'll create this)
npm run db:seed
```

### 6. Set Up PostHog (Optional but Recommended)

1. Go to [https://app.posthog.com](https://app.posthog.com) and sign up
2. Create a new project: "Travel Bids"
3. Go to **Project Settings**
4. Copy **Project API Key** (starts with `phc_`)
5. Add to `.env.local` as `NEXT_PUBLIC_POSTHOG_KEY`

---

## Running the Application

```bash
# Install dependencies (if you haven't)
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## What's Been Configured

### ✅ Tech Stack (per PROJECT_MASTER_PLAN.md)
- **Next.js 14+** with App Router & Server Components
- **TypeScript** (strict mode)
- **Prisma** ORM for type-safe database access
- **Supabase** for backend services
- **TanStack Query** for client-side data management
- **PostHog** for analytics
- **Tailwind CSS** for styling

### ✅ Tracking System
- **UTM parameter capture** (preserves ad attribution)
- **Session tracking** (30-day cookie)
- **Device type detection** (mobile/tablet/desktop)
- **PostHog integration** (automatic pageview tracking)

### ✅ Database Schema
All tables from master plan section 6:
- Users & session tracking
- Hotels, rooms, availability
- Bookings
- Page views & events
- Experiments & feature flags (Phase 2+)
- AI observations & recommendations (Phase 3+)

---

## Next Steps

After completing setup above, tell Claude:

```
"Supabase is set up! Let's continue Phase 1 - create the hotel listing page"
```

Or if you need help:

```
"I'm stuck on step X of SETUP.md - can you help?"
```

---

## Troubleshooting

### "Error: P1001: Can't reach database server"
- Check your `DATABASE_URL` in `.env.local`
- Make sure you replaced `[YOUR-PASSWORD]` with actual password
- Verify Supabase project is running (not paused)

### "Module not found: Can't resolve '@/lib/...'"
- Run `npm install` again
- Restart your dev server

### "Environment variable not found"
- Make sure file is named `.env.local` (not `.env`)
- Restart dev server after changing `.env.local`

---

## File Structure

```
travel-bids/
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page
├── lib/                    # Core libraries
│   ├── prisma.ts          # Database client
│   ├── supabase.ts        # Supabase client
│   ├── posthog.ts         # Analytics client
│   └── tracking.ts        # UTM & session tracking
├── providers/             # React context providers
│   ├── query-provider.tsx  # TanStack Query
│   └── posthog-provider.tsx # PostHog analytics
├── prisma/
│   └── schema.prisma      # Database schema
├── .env.local             # Environment variables (YOU NEED TO CONFIGURE)
├── .clinerules            # Claude Code rules
├── PROJECT_MASTER_PLAN.md # Architecture source of truth
└── SETUP.md              # This file
```
