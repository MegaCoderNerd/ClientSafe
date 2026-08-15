# ClientVault

ClientVault is a full-stack Next.js app for secure freelancer-to-client asset delivery with PayPal Checkout unlocks.

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + Supabase Postgres
- NextAuth.js credentials authentication
- PayPal Checkout (Orders API v2) for hosted payment + webhook unlock flow

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

   - `DATABASE_URL` (Supabase Postgres connection string)
   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (PayPal REST app)
   - `PAYPAL_WEBHOOK_ID` (webhook for `PAYMENT.CAPTURE.COMPLETED`)
   - `PAYPAL_MODE` (`sandbox` or `live`)
   - `PLATFORM_FEE_PERCENT` (`10`)
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

Apply the PayPal fee columns once in the Supabase SQL editor using `prisma/migrations/20260815231800_paypal_fees/migration.sql`.

## Run the App

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Account

- DEMO: `demo@clientvault.dev` / `demo123`

## Core Routes

- `/` — Freelancer project/asset setup and preview link generation
- `/p/[projectId]` — Client preview page with payment and unlock flow
- `/api/checkout` — Creates a PayPal order for the vault client
- `/api/paypal/capture` — Captures the PayPal order after return from PayPal
- `/api/webhooks/paypal` — Verifies PayPal webhooks and unlocks the asset

## PayPal webhook setup

PayPal cannot reach `http://localhost:3000`. For local tests, expose the app with a public HTTPS tunnel, then point a PayPal webhook at it. Returning from PayPal still captures on the server; the webhook is what unlocks the vault if the buyer closes the tab, and it is the verified path for `PAYMENT.CAPTURE.COMPLETED`.

### Default local tunnel (sandbox)

1. In one terminal, start the app:

   ```bash
   npm run dev
   ```

2. In a second terminal, start Cloudflare Tunnel (no PayPal/Cloudflare account needed for a quick tunnel).

   On Windows (PowerShell), Node must use the system certificate store if antivirus HTTPS scanning is on (this repo hit `UNABLE_TO_VERIFY_LEAF_SIGNATURE` without it):

   ```powershell
   $env:NODE_OPTIONS="--use-system-ca"
   npx --yes cloudflared tunnel --url http://localhost:3000
   ```

   On macOS/Linux:

   ```bash
   npx --yes cloudflared tunnel --url http://localhost:3000
   ```

3. Copy the `https://*.trycloudflare.com` URL it prints. That is your public origin for this session. The URL changes every time you restart the tunnel.

4. Open [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) → **Apps & Credentials** → your REST app (sandbox).

5. Under **Sandbox** → **Webhooks** → **Add Webhook**:
   - Webhook URL: `https://<your-trycloudflare-host>/api/webhooks/paypal`
   - Event types:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `CHECKOUT.ORDER.APPROVED`

6. Save the webhook, copy the **Webhook ID**, and put it in `.env`:

   ```
   PAYPAL_WEBHOOK_ID="the-webhook-id-from-paypal"
   PAYPAL_MODE="sandbox"
   ```

7. Restart `npm run dev` so the new env var loads.

8. Pay with a sandbox personal (buyer) account. After approval, PayPal should POST to the tunnel. In the dashboard, **Webhooks** → your webhook → **Webhook Events** should show HTTP 200.

If you prefer ngrok instead (same Windows TLS workaround):

```powershell
$env:NODE_OPTIONS="--use-system-ca"
npx --yes ngrok http 3000
```

Use the ngrok `https://` URL the same way as the Cloudflare URL.

### Promote the webhook to a real (deployed) URL

When the app is on a stable HTTPS host (Vercel, your domain, etc.), create a **new** webhook. Do not reuse the tunnel webhook ID.

1. Deploy the app and confirm `https://your-domain/api/webhooks/paypal` is reachable (a GET may 405; that is fine — PayPal uses POST).

2. Set production env vars on the host:
   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` from the **Live** PayPal app (or keep sandbox credentials if you are still testing on a public staging URL)
   - `PAYPAL_MODE=live` only after you have an Israeli PayPal Business account and are ready to take real payments
   - `NEXTAUTH_URL=https://your-domain` (no trailing slash)
   - `PAYPAL_WEBHOOK_ID` from the webhook you create in the next step

3. PayPal Developer Dashboard → the same REST app → **Webhooks** → **Add Webhook**:
   - URL: `https://your-domain/api/webhooks/paypal`
   - Events: `PAYMENT.CAPTURE.COMPLETED` and `CHECKOUT.ORDER.APPROVED`

4. Copy the new Webhook ID into the host’s `PAYPAL_WEBHOOK_ID`. Redeploy or restart so it loads.

5. Send a sandbox/live test event from the dashboard (**Webhooks** → **Simulate** / **Resend**) and confirm the vault unlocks only after a verified capture.

6. Optional cleanup: delete the old `trycloudflare` / ngrok webhook so PayPal stops retrying a dead tunnel.

Live checklist:

- Israeli PayPal Business account is approved
- REST app **Live** credentials are in the host env (not sandbox)
- `PAYPAL_MODE=live`
- Webhook URL is the public production origin, HTTPS only
- `PAYPAL_WEBHOOK_ID` matches that live webhook, not the local one

