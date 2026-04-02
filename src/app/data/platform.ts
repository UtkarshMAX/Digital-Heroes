import { supabase } from '../lib/supabase';

export type PlanCode = 'monthly' | 'yearly';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'lapsed';

export type CharityRecord = {
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
  upcomingEvents: CharityEventRecord[];
};

export type CharityEventRecord = {
  title: string;
  date: string;
  location: string;
};

export type ScoreRecord = {
  id: string;
  score: number;
  playedOn: string;
  courseName: string;
};

export type CharityPreferenceRecord = {
  charityId: string;
  contributionPercent: number;
  independentDonationEnabled: boolean;
};

export type SubscriptionRecord = {
  id: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  renewalAt: string | null;
  canceledAt?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
};

const DEMO_CHARITIES_KEY = 'impact-golf-demo-charities';
const DEMO_PREFIX = 'impact-golf-demo';

const defaultCharities: CharityRecord[] = [
  {
    id: 'charity-green-earth',
    slug: 'green-earth-conservancy',
    name: 'Green Earth Conservancy',
    category: 'Environment',
    shortDescription: 'Protecting endangered habitats and restoring forests.',
    description: 'Green Earth Conservancy funds habitat protection, reforestation, and biodiversity recovery projects across vulnerable ecosystems.',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    featured: true,
    isActive: true,
    locationLabel: 'Western Ghats and community rewilding zones',
    impactHeadline: 'Members help fund restoration crews, sapling programs, and habitat recovery reporting.',
    upcomingEvents: [
      { title: 'Spring Rewilding Golf Day', date: '2026-05-11', location: 'Bengaluru' },
      { title: 'Forest Recovery Impact Briefing', date: '2026-06-04', location: 'Virtual' },
    ],
  },
  {
    id: 'charity-future-leaders',
    slug: 'future-leaders-foundation',
    name: 'Future Leaders Foundation',
    category: 'Education',
    shortDescription: 'Expanding access to technology and learning resources.',
    description: 'Future Leaders Foundation helps under-resourced students access devices, mentoring, and modern educational opportunities.',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    featured: false,
    isActive: true,
    locationLabel: 'Urban schools and after-school innovation hubs',
    impactHeadline: 'Funding goes toward devices, coaching, and scholarship-linked learning programs.',
    upcomingEvents: [
      { title: 'Junior Scholars Tournament', date: '2026-04-20', location: 'Mumbai' },
      { title: 'Mentor Match Showcase', date: '2026-05-29', location: 'Delhi' },
    ],
  },
  {
    id: 'charity-global-water',
    slug: 'global-water-initiative',
    name: 'Global Water Initiative',
    category: 'Health',
    shortDescription: 'Building sustainable clean water access for communities in need.',
    description: 'Global Water Initiative partners with local communities to create long-lasting clean water infrastructure and sanitation systems.',
    imageUrl: 'https://images.unsplash.com/photo-1518558997970-4fdc41142512?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    featured: false,
    isActive: true,
    locationLabel: 'Rural water access projects and sanitation programs',
    impactHeadline: 'Support reaches filtration systems, repair teams, and community stewardship training.',
    upcomingEvents: [
      { title: 'Clean Water Invitational', date: '2026-05-07', location: 'Chennai' },
      { title: 'Field Partner Progress Call', date: '2026-06-15', location: 'Virtual' },
    ],
  },
];

function hasWindow() {
  return typeof window !== 'undefined';
}

function storageKey(scope: string, userId: string) {
  return `${DEMO_PREFIX}:${scope}:${userId}`;
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

function ensureDemoCharities() {
  const existing = readJson<CharityRecord[]>(DEMO_CHARITIES_KEY, []);
  if (existing.length === 0) {
    writeJson(DEMO_CHARITIES_KEY, defaultCharities);
    return defaultCharities;
  }

  return existing;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeEvents(value: unknown): CharityEventRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    const title = typeof candidate.title === 'string' ? candidate.title : '';
    const date = typeof candidate.date === 'string' ? candidate.date : '';
    const location = typeof candidate.location === 'string' ? candidate.location : '';

    if (!title || !date || !location) {
      return [];
    }

    return [{ title, date, location }];
  });
}

export async function listCharities(): Promise<CharityRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('charities')
      .select('id, slug, name, category, short_description, description, image_url, featured')
      .eq('is_active', true)
      .order('featured', { ascending: false })
      .order('name', { ascending: true });

    if (!error && data) {
      return data.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        category: item.category,
        shortDescription: item.short_description,
        description: item.description ?? item.short_description,
        imageUrl: item.image_url ?? '',
        featured: item.featured,
        isActive: true,
        upcomingEvents: normalizeEvents(item.upcoming_events),
      }));
    }
  }

  return ensureDemoCharities().filter((item) => item.isActive ?? true);
}

export async function getSubscription(userId: string): Promise<SubscriptionRecord | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, plan_code, status, renewal_at, canceled_at, provider_customer_id, provider_subscription_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        planCode: data.plan_code,
        status: data.status,
        renewalAt: data.renewal_at,
        canceledAt: data.canceled_at ?? null,
        providerCustomerId: data.provider_customer_id ?? null,
        providerSubscriptionId: data.provider_subscription_id ?? null,
      };
    }
  }

  return readJson<SubscriptionRecord | null>(storageKey('subscription', userId), {
    id: `sub-${userId}`,
    planCode: 'monthly',
    status: 'trialing',
    renewalAt: addDays(14),
    canceledAt: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
  });
}

export async function saveSubscription(userId: string, planCode: PlanCode) {
  const renewalAt = addDays(planCode === 'yearly' ? 365 : 30);

  if (supabase) {
    const current = await getSubscription(userId);
    if (current) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_code: planCode,
          status: 'active',
          renewal_at: renewalAt,
          canceled_at: null,
        })
        .eq('id', current.id);

      if (!error) {
        return;
      }
    }

    await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_code: planCode,
      status: 'active',
      renewal_at: renewalAt,
      canceled_at: null,
    });
    return;
  }

  writeJson(storageKey('subscription', userId), {
    id: `sub-${userId}`,
    planCode,
    status: 'active',
    renewalAt,
    canceledAt: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
  } satisfies SubscriptionRecord);
}

export async function cancelDemoSubscription(userId: string) {
  const current = await getSubscription(userId);
  if (!current) {
    return null;
  }

  const next: SubscriptionRecord = {
    ...current,
    status: 'canceled',
    canceledAt: new Date().toISOString(),
  };

  writeJson(storageKey('subscription', userId), next);
  return next;
}

export async function getCharityPreference(userId: string): Promise<CharityPreferenceRecord | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('user_charity_preferences')
      .select('charity_id, contribution_percent, independent_donation_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return {
        charityId: data.charity_id,
        contributionPercent: data.contribution_percent,
        independentDonationEnabled: data.independent_donation_enabled,
      };
    }
  }

  const charities = ensureDemoCharities();
  return readJson<CharityPreferenceRecord | null>(storageKey('charity-preference', userId), {
    charityId: charities[0]?.id ?? '',
    contributionPercent: 10,
    independentDonationEnabled: false,
  });
}

export async function saveCharityPreference(userId: string, preference: CharityPreferenceRecord) {
  if (supabase) {
    await supabase.from('user_charity_preferences').upsert({
      user_id: userId,
      charity_id: preference.charityId,
      contribution_percent: preference.contributionPercent,
      independent_donation_enabled: preference.independentDonationEnabled,
    }, { onConflict: 'user_id' });
    return;
  }

  writeJson(storageKey('charity-preference', userId), preference);
}

export async function listScores(userId: string): Promise<ScoreRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('golf_scores')
      .select('id, score, played_on, course_name')
      .eq('user_id', userId)
      .order('played_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      return data.map((item) => ({
        id: item.id,
        score: item.score,
        playedOn: item.played_on,
        courseName: item.course_name,
      }));
    }
  }

  return readJson<ScoreRecord[]>(storageKey('scores', userId), [
    { id: 'score-1', score: 42, playedOn: '2026-04-01', courseName: 'Pinehurst No. 2' },
    { id: 'score-2', score: 38, playedOn: '2026-03-28', courseName: 'Augusta National' },
    { id: 'score-3', score: 45, playedOn: '2026-03-15', courseName: 'St Andrews' },
  ]);
}

export async function saveScore(userId: string, input: { id?: string; score: number; playedOn: string; courseName: string }) {
  if (supabase) {
    if (input.id) {
      await supabase
        .from('golf_scores')
        .update({
          score: input.score,
          played_on: input.playedOn,
          course_name: input.courseName,
        })
        .eq('id', input.id)
        .eq('user_id', userId);
      return;
    }

    await supabase.from('golf_scores').insert({
      user_id: userId,
      score: input.score,
      played_on: input.playedOn,
      course_name: input.courseName,
    });

    const latest = await listScores(userId);
    if (latest.length > 5) {
      const overflow = latest.slice(5);
      if (overflow.length > 0) {
        await supabase.from('golf_scores').delete().in('id', overflow.map((item) => item.id));
      }
    }
    return;
  }

  const current = await listScores(userId);
  const nextId = input.id ?? `score-${crypto.randomUUID()}`;
  const withoutCurrent = current.filter((item) => item.id !== nextId);
  const merged = [
    {
      id: nextId,
      score: input.score,
      playedOn: input.playedOn,
      courseName: input.courseName,
    },
    ...withoutCurrent,
  ].sort((a, b) => new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime()).slice(0, 5);

  writeJson(storageKey('scores', userId), merged);
}

export async function deleteScore(userId: string, scoreId: string) {
  if (supabase) {
    await supabase.from('golf_scores').delete().eq('id', scoreId).eq('user_id', userId);
    return;
  }

  const current = await listScores(userId);
  writeJson(storageKey('scores', userId), current.filter((item) => item.id !== scoreId));
}
