import { env, hasNotificationEnv } from '../lib/env';

export type NotificationKind =
  | 'welcome'
  | 'draw-published'
  | 'winner-proof-submitted'
  | 'claim-reviewed'
  | 'payout-paid';

type NotificationPayload = {
  kind: NotificationKind;
  userId?: string;
  claimId?: string;
  monthKey?: string;
};

export function notificationBackendAvailable() {
  return hasNotificationEnv();
}

export async function sendNotification(payload: NotificationPayload) {
  if (!env.apiBaseUrl) {
    return { skipped: true as const };
  }

  const response = await fetch(`${env.apiBaseUrl}/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unable to send notification.');
  }

  return response.json() as Promise<{ delivered?: number; skipped?: boolean; message?: string }>;
}
