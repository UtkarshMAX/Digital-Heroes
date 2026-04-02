import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasSupabaseEnv } from '../lib/env';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../data/notifications';

type UserRole = 'member' | 'admin';

type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  backendMode: 'supabase' | 'demo';
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const DEMO_ACCOUNTS_KEY = 'impact-golf-demo-accounts';
const DEMO_SESSION_KEY = 'impact-golf-demo-session';

type DemoAccount = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function getDemoAccounts(): DemoAccount[] {
  const raw = window.localStorage.getItem(DEMO_ACCOUNTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as DemoAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDemoAccounts(accounts: DemoAccount[]) {
  window.localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getDemoSessionUser(): AppUser | null {
  const email = window.localStorage.getItem(DEMO_SESSION_KEY);
  if (!email) {
    return null;
  }

  const account = getDemoAccounts().find((item) => item.email === email);
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
  };
}

async function mapSupabaseSession(session: Session | null): Promise<AppUser | null> {
  if (!session?.user || !supabase) {
    return null;
  }

  const fallbackUser: AppUser = {
    id: session.user.id,
    email: session.user.email ?? '',
    fullName: (session.user.user_metadata.full_name as string | undefined) ?? 'Member',
    role: ((session.user.user_metadata.role as UserRole | undefined) ?? 'member'),
  };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !data) {
    return fallbackUser;
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const backendMode = hasSupabaseEnv() ? 'supabase' : 'demo';
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    if (backendMode === 'demo') {
      setUser(getDemoSessionUser());
      setLoading(false);
      return () => {
        active = false;
      };
    }

    if (!supabase) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) {
        return;
      }

      setUser(await mapSupabaseSession(data.session));
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      mapSupabaseSession(session).then((nextUser) => {
        if (!active) {
          return;
        }
        setUser(nextUser);
        setLoading(false);
      });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [backendMode]);

  const value: AuthContextValue = {
    user,
    loading,
    backendMode,
    async signIn(email, password) {
      if (backendMode === 'demo') {
        const account = getDemoAccounts().find((item) => item.email === normalizeEmail(email));
        if (!account) {
          return { ok: false, message: 'No account found for this email. Create an account first.' };
        }

        const hashed = await hashPassword(password);
        if (hashed !== account.passwordHash) {
          return { ok: false, message: 'Email or password is incorrect.' };
        }

        window.localStorage.setItem(DEMO_SESSION_KEY, account.email);
        setUser({
          id: account.id,
          email: account.email,
          fullName: account.fullName,
          role: account.role,
        });
        return { ok: true };
      }

      if (!supabase) {
        return { ok: false, message: 'Supabase is not configured.' };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    },
    async signUp(input) {
      if (input.fullName.trim().length < 2) {
        return { ok: false, message: 'Full name must be at least 2 characters.' };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
        return { ok: false, message: 'Enter a valid email address.' };
      }

      if (input.password.length < 8) {
        return { ok: false, message: 'Password must be at least 8 characters long.' };
      }

      if (backendMode === 'demo') {
        const accounts = getDemoAccounts();
        const email = normalizeEmail(input.email);
        if (accounts.some((item) => item.email === email)) {
          return { ok: false, message: 'An account with this email already exists. Please sign in.' };
        }

        const account: DemoAccount = {
          id: crypto.randomUUID(),
          email,
          fullName: input.fullName.trim(),
          passwordHash: await hashPassword(input.password),
          role: 'member',
        };

        saveDemoAccounts([...accounts, account]);
        window.localStorage.setItem(DEMO_SESSION_KEY, account.email);
        setUser({
          id: account.id,
          email: account.email,
          fullName: account.fullName,
          role: account.role,
        });

        void sendNotification({ kind: 'welcome', userId: account.id }).catch(() => undefined);

        return { ok: true };
      }

      if (!supabase) {
        return { ok: false, message: 'Supabase is not configured.' };
      }

      const { error } = await supabase.auth.signUp({
        email: normalizeEmail(input.email),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            role: 'member',
          },
        },
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const nextUserId = sessionData.session?.user?.id;
      if (nextUserId) {
        void sendNotification({ kind: 'welcome', userId: nextUserId }).catch(() => undefined);
      }

      return { ok: true };
    },
    async signOut() {
      if (backendMode === 'demo') {
        window.localStorage.removeItem(DEMO_SESSION_KEY);
        setUser(null);
        return;
      }

      await supabase?.auth.signOut();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
