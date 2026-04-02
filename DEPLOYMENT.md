# Deployment Guide

## Frontend

Deploy the Vite app to Vercel with these environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Supabase

Create a Supabase project and run these migrations in order:

- `supabase/migrations/20260402_initial_schema.sql`
- `supabase/migrations/20260402_admin_draw_policies.sql`
- `supabase/migrations/20260402_admin_management_policies.sql`

Set these Edge Function environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_LOOKUP_KEY`
- `STRIPE_YEARLY_PRICE_LOOKUP_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_BASE_URL`

## Payments

Configure Stripe products or lookup keys for monthly and yearly plans.

Register these webhook events against the deployed server function:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Point Stripe to:

- `/payments/webhook`

## Email notifications

The server can now send:

- welcome emails after signup
- draw publication emails
- winner proof submission alerts to admins
- claim review emails
- payout-paid emails

Email sending is skipped automatically when `RESEND_API_KEY` or `EMAIL_FROM` is missing.

## Health check

After deployment, verify:

- `GET /health`
- Checkout session creation from the subscription page
- Billing portal redirect
- Claim review flow
- Draw publish flow
- Email delivery logs in Resend
