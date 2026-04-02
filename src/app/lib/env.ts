export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined,
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasPaymentEnv() {
  return Boolean(env.apiBaseUrl);
}

export function hasNotificationEnv() {
  return Boolean(env.apiBaseUrl);
}
