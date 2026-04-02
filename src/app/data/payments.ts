import { env, hasPaymentEnv } from '../lib/env';
import type { PlanCode } from './platform';

type CheckoutPayload = {
  userId: string;
  email: string;
  fullName: string;
  planCode: PlanCode;
};

type CheckoutResponse = {
  checkoutUrl: string;
};

type PortalResponse = {
  portalUrl: string;
};

export function paymentBackendAvailable() {
  return hasPaymentEnv();
}

export async function createCheckoutSession(payload: CheckoutPayload) {
  if (!env.apiBaseUrl) {
    throw new Error('Payment backend is not configured.');
  }

  const response = await fetch(`${env.apiBaseUrl}/payments/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      successUrl: `${window.location.origin}/subscription?checkout=success`,
      cancelUrl: `${window.location.origin}/subscription?checkout=cancelled`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unable to create checkout session.');
  }

  return response.json() as Promise<CheckoutResponse>;
}

export async function createBillingPortalSession(userId: string) {
  if (!env.apiBaseUrl) {
    throw new Error('Payment backend is not configured.');
  }

  const response = await fetch(`${env.apiBaseUrl}/payments/create-billing-portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      returnUrl: `${window.location.origin}/subscription`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unable to create billing portal session.');
  }

  return response.json() as Promise<PortalResponse>;
}

export async function cancelSubscription(userId: string) {
  if (!env.apiBaseUrl) {
    throw new Error('Payment backend is not configured.');
  }

  const response = await fetch(`${env.apiBaseUrl}/payments/cancel-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unable to cancel subscription.');
  }

  return response.json() as Promise<{ status: string }>;
}
