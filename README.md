# ClientVault

ClientVault is a full-stack Next.js 14 demo for secure freelancer-to-client asset delivery with Stripe payment unlocks.

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + SQLite (local dev)
- NextAuth.js mock credentials authentication (single demo account)
- Stripe Node.js SDK (test mode) for checkout + webhook unlock flow

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment file:

   ```bash
   cp .env.example .env
   ```

3. Set required env vars in `.env`:

   - `DATABASE_URL` (example: `file:./dev.db`)
   - `STRIPE_SECRET_KEY` (Stripe test secret key)

   Also used by the app:

   - `STRIPE_WEBHOOK_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

## Prisma Migration & Seed

1. Generate Prisma client:

   ```bash
   npm run prisma:generate
   ```

2. Run migrations:

   ```bash
   npm run prisma:migrate -- --name init
   ```

3. Seed demo data (includes locked + unlocked projects):

   ```bash
   npm run prisma:seed
   ```

## Run the App

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Account

- DEMO: `demo@clientvault.dev` / `demo123`

## Core Routes

- `/dashboard` — Freelancer project/asset setup and preview link generation
- `/p/[projectId]` — Client preview page with payment and unlock flow
- `/api/checkout` — Creates Stripe Checkout Session for a project
- `/api/webhooks/stripe` — Handles `checkout.session.completed` and unlocks asset
