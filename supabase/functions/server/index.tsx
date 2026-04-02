import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

const serverBasePath = "/make-server-0699c1fb";

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

const stripe = () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(key, {
    apiVersion: "2025-03-31.basil",
  });
};

const planConfig = {
  monthly: {
    amount: 1500,
    interval: "month",
    lookupKey: Deno.env.get("STRIPE_MONTHLY_PRICE_LOOKUP_KEY"),
    label: "Impact Golf Monthly",
  },
  yearly: {
    amount: 14400,
    interval: "year",
    lookupKey: Deno.env.get("STRIPE_YEARLY_PRICE_LOOKUP_KEY"),
    label: "Impact Golf Yearly",
  },
} as const;

type PlanCode = keyof typeof planConfig;

type NotificationKind =
  | "welcome"
  | "draw-published"
  | "winner-proof-submitted"
  | "claim-reviewed"
  | "payout-paid";

function notificationConfig() {
  return {
    apiKey: Deno.env.get("RESEND_API_KEY") ?? "",
    fromEmail: Deno.env.get("EMAIL_FROM") ?? "",
    appBaseUrl: Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173",
  };
}

async function deliverEmail(recipients: string[], subject: string, html: string) {
  const config = notificationConfig();
  if (!config.apiKey || !config.fromEmail || recipients.length === 0) {
    return { skipped: true, delivered: 0 };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromEmail,
      to: recipients,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Email delivery failed.");
  }

  return { skipped: false, delivered: recipients.length };
}

async function getUserProfile(userId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

async function getAdminRecipients() {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "admin");

  return (data ?? []).map((item) => item.email).filter(Boolean);
}

async function getClaimContext(claimId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("winner_claims")
    .select("id, review_status, payout_status, proof_file_path, admin_notes, draw_entry_id, user_id, draw_entries(match_count, prize_cents, draw_run_id), profiles(full_name, email)")
    .eq("id", claimId)
    .maybeSingle();

  return data;
}

async function getDrawRecipients(monthKey: string) {
  const admin = supabaseAdmin();
  const { data: drawRun } = await admin
    .from("draw_runs")
    .select("id")
    .eq("month_key", monthKey)
    .eq("status", "published")
    .maybeSingle();

  if (!drawRun?.id) {
    return [];
  }

  const { data } = await admin
    .from("draw_entries")
    .select("user_id, profiles(email, full_name)")
    .eq("draw_run_id", drawRun.id);

  return (data ?? []).flatMap((entry) => {
    const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
    return profile?.email ? [{ email: profile.email, fullName: profile.full_name ?? "Member" }] : [];
  });
}

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "Stripe-Signature"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get(`${serverBasePath}/health`, (c) => c.json({ status: "ok" }));

app.post(`${serverBasePath}/payments/create-checkout-session`, async (c) => {
  try {
    const body = await c.req.json();
    const {
      userId,
      email,
      fullName,
      planCode,
      successUrl,
      cancelUrl,
    } = body as {
      userId: string;
      email: string;
      fullName: string;
      planCode: PlanCode;
      successUrl: string;
      cancelUrl: string;
    };

    if (!userId || !email || !fullName || !planCode || !successUrl || !cancelUrl) {
      return c.json({ error: "Missing required checkout payload." }, 400);
    }

    if (!(planCode in planConfig)) {
      return c.json({ error: "Unsupported subscription plan." }, 400);
    }

    const stripeClient = stripe();
    const config = planConfig[planCode];

    let priceId: string | undefined;
    if (config.lookupKey) {
      const prices = await stripeClient.prices.list({
        lookup_keys: [config.lookupKey],
        expand: ["data.product"],
        limit: 1,
      });
      priceId = prices.data[0]?.id;
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        userId,
        planCode,
        fullName,
      },
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [{
            price_data: {
              currency: "usd",
              unit_amount: config.amount,
              recurring: { interval: config.interval },
              product_data: {
                name: config.label,
              },
            },
            quantity: 1,
          }],
    });

    return c.json({ checkoutUrl: session.url });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Checkout creation failed." }, 500);
  }
});

app.post(`${serverBasePath}/payments/create-billing-portal-session`, async (c) => {
  try {
    const body = await c.req.json();
    const { userId, returnUrl } = body as { userId: string; returnUrl: string };

    if (!userId || !returnUrl) {
      return c.json({ error: "Missing required portal payload." }, 400);
    }

    const admin = supabaseAdmin();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription?.provider_customer_id) {
      return c.json({ error: "No Stripe customer found for this user." }, 400);
    }

    const session = await stripe().billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      return_url: returnUrl,
    });

    return c.json({ portalUrl: session.url });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Billing portal creation failed." }, 500);
  }
});

app.post(`${serverBasePath}/payments/cancel-subscription`, async (c) => {
  try {
    const body = await c.req.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return c.json({ error: "Missing user id." }, 400);
    }

    const admin = supabaseAdmin();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id, provider_subscription_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription?.provider_subscription_id) {
      return c.json({ error: "No active Stripe subscription found." }, 400);
    }

    const cancelled = await stripe().subscriptions.update(subscription.provider_subscription_id, {
      cancel_at_period_end: true,
    });

    await admin
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: cancelled.cancel_at
          ? new Date(cancelled.cancel_at * 1000).toISOString()
          : new Date().toISOString(),
        renewal_at: cancelled.current_period_end
          ? new Date(cancelled.current_period_end * 1000).toISOString()
          : null,
      })
      .eq("id", subscription.id);

    return c.json({ status: "canceled" });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Cancellation failed." }, 500);
  }
});

app.post(`${serverBasePath}/payments/webhook`, async (c) => {
  try {
    const signature = c.req.header("Stripe-Signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const rawBody = await c.req.text();

    if (!signature || !webhookSecret) {
      return c.json({ error: "Webhook signature or secret is missing." }, 400);
    }

    const stripeClient = stripe();
    const event = await stripeClient.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    const admin = supabaseAdmin();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const planCode = session.metadata?.planCode as PlanCode | undefined;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (userId && planCode) {
        await admin.from("subscriptions").upsert({
          user_id: userId,
          plan_code: planCode,
          status: "active",
          provider: "stripe",
          provider_customer_id: customerId ?? null,
          provider_subscription_id: subscriptionId ?? null,
        }, { onConflict: "provider_subscription_id" });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const statusMap: Record<string, "trialing" | "active" | "past_due" | "canceled" | "lapsed"> = {
        trialing: "trialing",
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        unpaid: "lapsed",
        incomplete_expired: "lapsed",
        incomplete: "past_due",
      };

      await admin
        .from("subscriptions")
        .update({
          status: statusMap[subscription.status] ?? "past_due",
          renewal_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
        })
        .eq("provider_subscription_id", subscription.id);
    }

    return c.json({ received: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, 400);
  }
});

app.post(`${serverBasePath}/notifications/send`, async (c) => {
  try {
    const body = await c.req.json();
    const { kind, userId, claimId, monthKey } = body as {
      kind: NotificationKind;
      userId?: string;
      claimId?: string;
      monthKey?: string;
    };

    if (!kind) {
      return c.json({ error: "Missing notification kind." }, 400);
    }

    const config = notificationConfig();
    if (!config.apiKey || !config.fromEmail) {
      return c.json({ skipped: true, message: "Notification provider is not configured." });
    }

    if (kind === "welcome") {
      if (!userId) {
        return c.json({ error: "Missing user id for welcome email." }, 400);
      }

      const user = await getUserProfile(userId);
      if (!user?.email) {
        return c.json({ skipped: true, message: "No recipient email found." });
      }

      const result = await deliverEmail(
        [user.email],
        "Welcome to Impact Golf",
        `<p>Hi ${user.full_name},</p><p>Your account is ready. You can now choose a charity, activate your membership, and join the monthly draw.</p><p><a href="${config.appBaseUrl}/dashboard">Open your dashboard</a></p>`,
      );

      return c.json(result);
    }

    if (kind === "draw-published") {
      if (!monthKey) {
        return c.json({ error: "Missing month key for draw notification." }, 400);
      }

      const recipients = await getDrawRecipients(monthKey);
      const result = await deliverEmail(
        recipients.map((item) => item.email),
        `Impact Golf draw published for ${monthKey}`,
        `<p>The monthly draw for ${monthKey} has been published.</p><p><a href="${config.appBaseUrl}/draws">View your results</a></p>`,
      );

      return c.json(result);
    }

    if (!claimId) {
      return c.json({ error: "Missing claim id." }, 400);
    }

    const claim = await getClaimContext(claimId);
    if (!claim) {
      return c.json({ skipped: true, message: "Claim record not found." });
    }

    const profile = Array.isArray(claim.profiles) ? claim.profiles[0] : claim.profiles;
    const entry = Array.isArray(claim.draw_entries) ? claim.draw_entries[0] : claim.draw_entries;
    const memberEmail = profile?.email;
    const memberName = profile?.full_name ?? "Member";

    if (kind === "winner-proof-submitted") {
      const adminRecipients = await getAdminRecipients();
      const result = await deliverEmail(
        adminRecipients,
        "Winner proof submitted",
        `<p>${memberName} submitted proof for a ${entry?.match_count ?? 0}-match claim.</p><p>Review the submission in the admin dashboard.</p>`,
      );
      return c.json(result);
    }

    if (!memberEmail) {
      return c.json({ skipped: true, message: "Member email unavailable." });
    }

    if (kind === "claim-reviewed") {
      const result = await deliverEmail(
        [memberEmail],
        "Your winner claim has been reviewed",
        `<p>Hi ${memberName},</p><p>Your claim review status is now <strong>${claim.review_status}</strong>.</p><p>${claim.admin_notes ? `Admin note: ${claim.admin_notes}` : ""}</p><p><a href="${config.appBaseUrl}/draws">Open draw results</a></p>`,
      );
      return c.json(result);
    }

    if (kind === "payout-paid") {
      const result = await deliverEmail(
        [memberEmail],
        "Your payout has been marked paid",
        `<p>Hi ${memberName},</p><p>Your payout for ${entry?.match_count ?? 0} matches has been marked as paid.</p><p>Prize value: $${((entry?.prize_cents ?? 0) / 100).toFixed(2)}</p><p><a href="${config.appBaseUrl}/draws">View claim status</a></p>`,
      );
      return c.json(result);
    }

    return c.json({ skipped: true, message: "Unsupported notification request." });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Notification handling failed." }, 500);
  }
});

Deno.serve(app.fetch);
