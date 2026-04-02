import { listWinnerClaimsForAdmin } from './claims';
import { getAdminDrawSummary } from './draws';
import { supabase } from '../lib/supabase';

export type AdminMemberRecord = {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
  plan: 'Monthly' | 'Yearly' | 'None';
  status: 'Active' | 'Trialing' | 'Past Due' | 'Canceled' | 'Lapsed' | 'Inactive';
  joined: string;
  renewalAt: string | null;
};

export type AdminCharityRecord = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  featured: boolean;
  isActive: boolean;
  updatedAt: string | null;
};

export type AdminGrowthPoint = {
  label: string;
  members: number;
  activeSubscriptions: number;
};

export type AdminAnalytics = {
  totalMembers: number;
  activeMembers: number;
  totalCharities: number;
  featuredCharities: number;
  pendingClaims: number;
  growth: AdminGrowthPoint[];
};

export type AdminCharityInput = {
  id?: string;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  featured: boolean;
  isActive: boolean;
};

const DEMO_ACCOUNTS_KEY = 'impact-golf-demo-accounts';
const DEMO_CHARITIES_KEY = 'impact-golf-demo-charities';
const DEMO_PREFIX = 'impact-golf-demo';

type DemoAccount = {
  id: string;
  email: string;
  fullName: string;
  role: 'member' | 'admin';
};

type DemoSubscription = {
  id: string;
  planCode: 'monthly' | 'yearly';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'lapsed';
  renewalAt: string | null;
};

type DemoCharity = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  featured: boolean;
  isActive?: boolean;
  locationLabel?: string;
  impactHeadline?: string;
  upcomingEvents: Array<{ title: string; date: string; location: string }>;
};

function hasWindow() {
  return typeof window !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasWindow()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function titleCaseStatus(status: string): AdminMemberRecord['status'] {
  if (status === 'active') return 'Active';
  if (status === 'trialing') return 'Trialing';
  if (status === 'past_due') return 'Past Due';
  if (status === 'canceled') return 'Canceled';
  if (status === 'lapsed') return 'Lapsed';
  return 'Inactive';
}

function normalizePlan(planCode: string | null | undefined): AdminMemberRecord['plan'] {
  if (planCode === 'yearly') {
    return 'Yearly';
  }
  if (planCode === 'monthly') {
    return 'Monthly';
  }
  return 'None';
}

function getDemoAccounts() {
  return readJson<DemoAccount[]>(DEMO_ACCOUNTS_KEY, []);
}

function getDemoSubscription(userId: string) {
  return readJson<DemoSubscription | null>(`${DEMO_PREFIX}:subscription:${userId}`, null);
}

function getDemoCharities() {
  return readJson<DemoCharity[]>(DEMO_CHARITIES_KEY, []);
}

function buildRecentMonthLabels() {
  const points: Array<{ key: string; label: string }> = [];
  const current = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(current.getFullYear(), current.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    points.push({
      key,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }

  return points;
}

function buildGrowthSeries(members: AdminMemberRecord[]) {
  const months = buildRecentMonthLabels();

  return months.map((month) => {
    const membersJoined = members.filter((member) => member.joined.slice(0, 7) === month.key).length;
    const activeSubscriptions = members.filter((member) => {
      const memberMonth = member.joined.slice(0, 7);
      return memberMonth <= month.key && (member.status === 'Active' || member.status === 'Trialing');
    }).length;

    return {
      label: month.label,
      members: membersJoined,
      activeSubscriptions,
    };
  });
}

export async function listAdminMembers(): Promise<AdminMemberRecord[]> {
  if (supabase) {
    const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('user_id, plan_code, status, renewal_at, created_at')
        .order('created_at', { ascending: false }),
    ]);

    const latestSubscriptionByUser = new Map<string, { plan_code: 'monthly' | 'yearly'; status: string; renewal_at: string | null }>();
    (subscriptions ?? []).forEach((subscription) => {
      if (!latestSubscriptionByUser.has(subscription.user_id)) {
        latestSubscriptionByUser.set(subscription.user_id, subscription);
      }
    });

    return (profiles ?? []).map((profile) => {
      const subscription = latestSubscriptionByUser.get(profile.id);
      return {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: profile.role,
        plan: normalizePlan(subscription?.plan_code),
        status: titleCaseStatus(subscription?.status ?? 'inactive'),
        joined: profile.created_at,
        renewalAt: subscription?.renewal_at ?? null,
      };
    });
  }

  return getDemoAccounts()
    .map((account) => {
      const subscription = getDemoSubscription(account.id);
      return {
        id: account.id,
        name: account.fullName,
        email: account.email,
        role: account.role,
        plan: normalizePlan(subscription?.planCode),
        status: titleCaseStatus(subscription?.status ?? 'inactive'),
        joined: new Date().toISOString(),
        renewalAt: subscription?.renewalAt ?? null,
      } satisfies AdminMemberRecord;
    })
    .sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime());
}

export async function listAdminCharities(): Promise<AdminCharityRecord[]> {
  if (supabase) {
    const { data } = await supabase
      .from('charities')
      .select('id, slug, name, category, short_description, featured, is_active, updated_at')
      .order('featured', { ascending: false })
      .order('name', { ascending: true });

    return (data ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      category: item.category,
      shortDescription: item.short_description,
      featured: item.featured,
      isActive: item.is_active,
      updatedAt: item.updated_at,
    }));
  }

  return getDemoCharities()
    .map((charity) => ({
      id: charity.id,
      slug: charity.slug,
      name: charity.name,
      category: charity.category,
      shortDescription: charity.shortDescription,
      featured: charity.featured,
      isActive: charity.isActive ?? true,
      updatedAt: null,
    }))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [members, charities, claims] = await Promise.all([
    listAdminMembers(),
    listAdminCharities(),
    listWinnerClaimsForAdmin(),
  ]);

  return {
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.status === 'Active' || member.status === 'Trialing').length,
    totalCharities: charities.filter((charity) => charity.isActive).length,
    featuredCharities: charities.filter((charity) => charity.featured && charity.isActive).length,
    pendingClaims: claims.filter((claim) => claim.reviewStatus === 'pending').length,
    growth: buildGrowthSeries(members),
  };
}

export async function saveAdminCharity(input: AdminCharityInput) {
  if (supabase) {
    if (input.id) {
      await supabase
        .from('charities')
        .update({
          name: input.name.trim(),
          slug: input.slug.trim(),
          category: input.category.trim(),
          short_description: input.shortDescription.trim(),
          featured: input.featured,
          is_active: input.isActive,
        })
        .eq('id', input.id);
    } else {
      await supabase
        .from('charities')
        .insert({
          name: input.name.trim(),
          slug: input.slug.trim(),
          category: input.category.trim(),
          short_description: input.shortDescription.trim(),
          description: input.shortDescription.trim(),
          featured: input.featured,
          is_active: input.isActive,
          image_url: '',
        });
    }

    return;
  }

  const charities = getDemoCharities();

  if (input.id) {
    const next = charities.map((charity) => (
      charity.id === input.id
        ? {
            ...charity,
            name: input.name.trim(),
            slug: input.slug.trim(),
            category: input.category.trim(),
            shortDescription: input.shortDescription.trim(),
            description: charity.description || input.shortDescription.trim(),
            featured: input.featured,
            isActive: input.isActive,
          }
        : charity
    ));

    writeJson(DEMO_CHARITIES_KEY, next);
    return;
  }

  writeJson(DEMO_CHARITIES_KEY, [
    {
      id: `charity-${crypto.randomUUID()}`,
      slug: input.slug.trim(),
      name: input.name.trim(),
      category: input.category.trim(),
      shortDescription: input.shortDescription.trim(),
      description: input.shortDescription.trim(),
      imageUrl: '',
      featured: input.featured,
      isActive: input.isActive,
      locationLabel: 'Newly added by admin',
      impactHeadline: 'Admin-added cause ready for profile enrichment.',
      upcomingEvents: [],
    },
    ...charities,
  ]);
}

export async function toggleAdminCharityState(charityId: string, nextActive: boolean) {
  if (supabase) {
    await supabase
      .from('charities')
      .update({ is_active: nextActive })
      .eq('id', charityId);
    return;
  }

  const next = getDemoCharities().map((charity) => (
    charity.id === charityId
      ? { ...charity, isActive: nextActive }
      : charity
  ));

  writeJson(DEMO_CHARITIES_KEY, next);
}

export async function getAdminDashboardSnapshot(userId: string) {
  const [analytics, members, charities, drawSummary] = await Promise.all([
    getAdminAnalytics(),
    listAdminMembers(),
    listAdminCharities(),
    getAdminDrawSummary(userId),
  ]);

  return {
    analytics,
    members,
    charities,
    drawSummary,
  };
}
