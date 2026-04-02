import { getCharityPreference, listScores } from './platform';
import { supabase } from '../lib/supabase';
import { sendNotification } from './notifications';

export type DrawMode = 'random' | 'weighted';
export type DrawStatus = 'draft' | 'simulated' | 'published';

export type DrawEntryRecord = {
  id?: string;
  userId: string;
  displayName: string;
  scoreSnapshot: number[];
  matchCount: number;
  prizeCents: number;
  charityCents: number;
};

export type DrawState = {
  id: string;
  monthKey: string;
  mode: DrawMode;
  status: DrawStatus;
  winningNumbers: number[];
  jackpotPoolCents: number;
  tier4PoolCents: number;
  tier3PoolCents: number;
  activeSubscribers: number;
  publishedAt: string | null;
  entries: DrawEntryRecord[];
};

export type UserDrawView = {
  state: DrawState | null;
  userEntry: DrawEntryRecord | null;
  pending: boolean;
  nextRolloverCents: number;
};

export type AdminDrawSummary = {
  state: DrawState | null;
  nextRolloverCents: number;
  winners: {
    fiveMatch: number;
    fourMatch: number;
    threeMatch: number;
  };
};

const DEMO_DRAW_KEY = 'impact-golf-demo-draw-state';
const DEMO_ROLLOVER_KEY = 'impact-golf-demo-rollover-cents';
const BASE_MONTHLY_POOL_CENTS = 1500;

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

export function getCurrentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDrawLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function uniqueNumbers(numbers: number[]) {
  return Array.from(new Set(numbers));
}

function countMatches(scoreSnapshot: number[], winningNumbers: number[]) {
  return scoreSnapshot.filter((num) => winningNumbers.includes(num)).length;
}

function pickRandomUnique(max: number, count: number, source?: number[]) {
  const pool = source && source.length > 0 ? uniqueNumbers(source.filter((num) => num >= 1 && num <= max)) : [];
  const available = pool.length >= count
    ? [...pool]
    : [...pool, ...Array.from({ length: max }, (_, index) => index + 1).filter((num) => !pool.includes(num))];

  const picked: number[] = [];
  while (picked.length < count && available.length > 0) {
    const index = Math.floor(Math.random() * available.length);
    picked.push(available[index]);
    available.splice(index, 1);
  }
  return picked;
}

function generateWinningNumbers(mode: DrawMode, entries: Array<{ scoreSnapshot: number[] }>) {
  if (mode === 'random') {
    return pickRandomUnique(45, 5).sort((a, b) => a - b);
  }

  const frequency = new Map<number, number>();
  entries.forEach((entry) => {
    entry.scoreSnapshot.forEach((num) => {
      frequency.set(num, (frequency.get(num) ?? 0) + 1);
    });
  });

  const sorted = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([num]) => num);

  const weighted = uniqueNumbers([
    ...sorted.slice(0, 3),
    ...pickRandomUnique(45, 5, sorted.slice(3)),
  ]).slice(0, 5);

  if (weighted.length < 5) {
    weighted.push(...pickRandomUnique(45, 5 - weighted.length, sorted));
  }

  return uniqueNumbers(weighted).slice(0, 5).sort((a, b) => a - b);
}

function buildDemoCommunityEntries(userId: string, userScores: number[]) {
  const snapshots = [
    userScores.length > 0 ? userScores : [12, 18, 33, 42, 7],
    [10, 14, 21, 33, 41],
    [7, 12, 24, 33, 45],
    [6, 19, 24, 28, 41],
    [9, 17, 24, 33, 42],
    [3, 12, 18, 29, 39],
    [8, 20, 24, 31, 41],
    [7, 11, 18, 33, 40],
  ];

  return snapshots.map((scoreSnapshot, index) => ({
    userId: index === 0 ? userId : `demo-user-${index}`,
    displayName: index === 0 ? 'You' : `Member ${index + 1}`,
    scoreSnapshot,
  }));
}

async function getActiveSubscriberCount() {
  if (supabase) {
    const { count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['trialing', 'active']);

    return count && count > 0 ? count : 284;
  }

  return 284;
}

async function buildParticipantEntries(userId: string) {
  if (!supabase) {
    const userScores = (await listScores(userId)).map((item) => item.score);
    return buildDemoCommunityEntries(userId, userScores);
  }

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('user_id')
    .in('status', ['trialing', 'active']);

  const subscriberIds = uniqueNumbers((subscriptions ?? []).map((item) => Number.NaN)).length; // noop to keep linter happy for numeric util
  void subscriberIds;

  const userIds = [...new Set((subscriptions ?? []).map((item) => item.user_id))];
  if (userIds.length === 0) {
    const fallbackScores = (await listScores(userId)).map((item) => item.score);
    return buildDemoCommunityEntries(userId, fallbackScores);
  }

  const [{ data: profiles }, { data: scores }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', userIds),
    supabase.from('golf_scores').select('id, user_id, score, played_on, created_at').in('user_id', userIds).order('played_on', { ascending: false }).order('created_at', { ascending: false }),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const scoreMap = new Map<string, number[]>();

  (scores ?? []).forEach((score) => {
    const existing = scoreMap.get(score.user_id) ?? [];
    if (existing.length < 5) {
      existing.push(score.score);
      scoreMap.set(score.user_id, existing);
    }
  });

  return userIds
    .map((id) => ({
      userId: id,
      displayName: id === userId ? 'You' : (profileMap.get(id) ?? 'Member'),
      scoreSnapshot: scoreMap.get(id) ?? [],
    }))
    .filter((entry) => entry.scoreSnapshot.length > 0);
}

function splitPrize(poolCents: number, winners: DrawEntryRecord[]) {
  if (winners.length === 0) {
    return 0;
  }

  return Math.floor(poolCents / winners.length);
}

function hydrateEntries(
  baseEntries: Array<{ userId: string; displayName: string; scoreSnapshot: number[] }>,
  winningNumbers: number[],
  pools: { jackpotPoolCents: number; tier4PoolCents: number; tier3PoolCents: number },
  contributionPercentByUser: Map<string, number>,
) {
  const entries: DrawEntryRecord[] = baseEntries.map((entry) => ({
    ...entry,
    matchCount: countMatches(entry.scoreSnapshot, winningNumbers),
    prizeCents: 0,
    charityCents: 0,
  }));

  const fiveMatch = entries.filter((entry) => entry.matchCount === 5);
  const fourMatch = entries.filter((entry) => entry.matchCount === 4);
  const threeMatch = entries.filter((entry) => entry.matchCount === 3);

  const fivePrize = splitPrize(pools.jackpotPoolCents, fiveMatch);
  const fourPrize = splitPrize(pools.tier4PoolCents, fourMatch);
  const threePrize = splitPrize(pools.tier3PoolCents, threeMatch);

  entries.forEach((entry) => {
    if (entry.matchCount === 5) {
      entry.prizeCents = fivePrize;
    } else if (entry.matchCount === 4) {
      entry.prizeCents = fourPrize;
    } else if (entry.matchCount === 3) {
      entry.prizeCents = threePrize;
    }

    if (entry.prizeCents > 0) {
      const contributionPercent = contributionPercentByUser.get(entry.userId) ?? 10;
      entry.charityCents = Math.floor(entry.prizeCents * (contributionPercent / 100));
    }
  });

  return entries;
}

function getStoredRolloverCents() {
  return readJson<number>(DEMO_ROLLOVER_KEY, 0);
}

async function getSupabaseRolloverCents(monthKey: string) {
  if (!supabase) {
    return getStoredRolloverCents();
  }

  const { data } = await supabase
    .from('draw_runs')
    .select('jackpot_pool_cents, entries:draw_entries(match_count)')
    .lt('month_key', monthKey)
    .order('month_key', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return 0;
  }

  const hadJackpotWinner = (data.entries ?? []).some((entry: { match_count: number }) => entry.match_count === 5);
  return hadJackpotWinner ? 0 : data.jackpot_pool_cents;
}

export function getStoredDrawState(monthKey: string) {
  const state = readJson<DrawState | null>(DEMO_DRAW_KEY, null);
  return state?.monthKey === monthKey ? state : null;
}

async function getSupabaseDrawState(monthKey: string): Promise<DrawState | null> {
  if (!supabase) {
    return null;
  }

  const { data: drawRun } = await supabase
    .from('draw_runs')
    .select('id, month_key, draw_mode, status, winning_numbers, jackpot_pool_cents, tier_4_pool_cents, tier_3_pool_cents, published_at')
    .eq('month_key', monthKey)
    .maybeSingle();

  if (!drawRun) {
    return null;
  }

  const { data: entries } = await supabase
    .from('draw_entries')
    .select('id, user_id, score_snapshot, match_count, prize_cents, charity_cents')
    .eq('draw_run_id', drawRun.id);

  const userIds = [...new Set((entries ?? []).map((entry) => entry.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  return {
    id: drawRun.id,
    monthKey: drawRun.month_key,
    mode: drawRun.draw_mode,
    status: drawRun.status,
    winningNumbers: drawRun.winning_numbers,
    jackpotPoolCents: drawRun.jackpot_pool_cents,
    tier4PoolCents: drawRun.tier_4_pool_cents,
    tier3PoolCents: drawRun.tier_3_pool_cents,
    activeSubscribers: userIds.length,
    publishedAt: drawRun.published_at,
    entries: (entries ?? []).map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      displayName: profileMap.get(entry.user_id) ?? 'Member',
      scoreSnapshot: entry.score_snapshot,
      matchCount: entry.match_count,
      prizeCents: entry.prize_cents,
      charityCents: entry.charity_cents,
    })),
  };
}

async function getContributionPercentMap(userIds: string[]) {
  const map = new Map<string, number>();

  if (supabase && userIds.length > 0) {
    const { data } = await supabase
      .from('user_charity_preferences')
      .select('user_id, contribution_percent')
      .in('user_id', userIds);

    (data ?? []).forEach((item) => {
      map.set(item.user_id, item.contribution_percent);
    });
  } else {
    for (const userId of userIds) {
      const preference = await getCharityPreference(userId);
      map.set(userId, preference?.contributionPercent ?? 10);
    }
  }

  return map;
}

export function getCurrentDrawLabel() {
  return getDrawLabel(getCurrentMonthKey());
}

export async function simulateMonthlyDraw(userId: string, mode: DrawMode) {
  const monthKey = getCurrentMonthKey();
  const participants = await buildParticipantEntries(userId);
  const activeSubscribers = await getActiveSubscriberCount();
  const priorRolloverCents = supabase ? await getSupabaseRolloverCents(monthKey) : getStoredRolloverCents();
  const basePoolCents = activeSubscribers * BASE_MONTHLY_POOL_CENTS;
  const winningNumbers = generateWinningNumbers(mode, participants);
  const contributionPercentByUser = await getContributionPercentMap(participants.map((entry) => entry.userId));

  const pools = {
    jackpotPoolCents: Math.floor(basePoolCents * 0.4) + priorRolloverCents,
    tier4PoolCents: Math.floor(basePoolCents * 0.35),
    tier3PoolCents: Math.floor(basePoolCents * 0.25),
  };

  const entries = hydrateEntries(participants, winningNumbers, pools, contributionPercentByUser);

  const state: DrawState = {
    id: `draw-${monthKey}`,
    monthKey,
    mode,
    status: 'simulated',
    winningNumbers,
    jackpotPoolCents: pools.jackpotPoolCents,
    tier4PoolCents: pools.tier4PoolCents,
    tier3PoolCents: pools.tier3PoolCents,
    activeSubscribers,
    publishedAt: null,
    entries,
  };

  if (supabase) {
    const existing = await getSupabaseDrawState(monthKey);
    let drawRunId = existing?.id;

    if (existing?.id) {
      await supabase
        .from('draw_runs')
        .update({
          draw_mode: mode,
          status: 'simulated',
          winning_numbers: winningNumbers,
          jackpot_pool_cents: pools.jackpotPoolCents,
          tier_4_pool_cents: pools.tier4PoolCents,
          tier_3_pool_cents: pools.tier3PoolCents,
          published_at: null,
        })
        .eq('id', existing.id);

      await supabase.from('draw_entries').delete().eq('draw_run_id', existing.id);
    } else {
      const { data } = await supabase
        .from('draw_runs')
        .insert({
          month_key: monthKey,
          draw_mode: mode,
          status: 'simulated',
          winning_numbers: winningNumbers,
          jackpot_pool_cents: pools.jackpotPoolCents,
          tier_4_pool_cents: pools.tier4PoolCents,
          tier_3_pool_cents: pools.tier3PoolCents,
          created_by: userId,
        })
        .select('id')
        .single();

      drawRunId = data?.id;
    }

    if (drawRunId) {
      await supabase.from('draw_entries').insert(entries.map((entry) => ({
        draw_run_id: drawRunId,
        user_id: entry.userId,
        score_snapshot: entry.scoreSnapshot,
        match_count: entry.matchCount,
        prize_cents: entry.prizeCents,
        charity_cents: entry.charityCents,
      })));
    }

    const persisted = await getSupabaseDrawState(monthKey);
    return persisted ?? state;
  }

  writeJson(DEMO_DRAW_KEY, state);
  return state;
}

export async function publishMonthlyDraw(userId: string, mode: DrawMode) {
  const monthKey = getCurrentMonthKey();
  let state = supabase ? await getSupabaseDrawState(monthKey) : getStoredDrawState(monthKey);

  if (!state || state.status === 'draft') {
    state = await simulateMonthlyDraw(userId, mode);
  }

  const publishedState: DrawState = {
    ...state,
    status: 'published',
    publishedAt: new Date().toISOString(),
  };

  if (supabase) {
    await supabase
      .from('draw_runs')
      .update({
        status: 'published',
        published_at: publishedState.publishedAt,
      })
      .eq('id', publishedState.id);

    const persisted = await getSupabaseDrawState(monthKey);
    void sendNotification({ kind: 'draw-published', monthKey }).catch(() => undefined);
    return persisted ?? publishedState;
  }

  const jackpotWon = publishedState.entries.some((entry) => entry.matchCount === 5);
  writeJson(DEMO_ROLLOVER_KEY, jackpotWon ? 0 : publishedState.jackpotPoolCents);
  writeJson(DEMO_DRAW_KEY, publishedState);
  void sendNotification({ kind: 'draw-published', monthKey }).catch(() => undefined);

  return publishedState;
}

export async function getUserDrawView(userId: string): Promise<UserDrawView> {
  const monthKey = getCurrentMonthKey();
  const state = supabase ? await getSupabaseDrawState(monthKey) : getStoredDrawState(monthKey);
  const nextRolloverCents = supabase ? await getSupabaseRolloverCents(monthKey) : getStoredRolloverCents();

  if (!state || state.status !== 'published') {
    return {
      state,
      userEntry: null,
      pending: true,
      nextRolloverCents,
    };
  }

  return {
    state,
    userEntry: state.entries.find((entry) => entry.userId === userId) ?? null,
    pending: false,
    nextRolloverCents,
  };
}

export async function getAdminDrawSummary(_userId: string): Promise<AdminDrawSummary> {
  const monthKey = getCurrentMonthKey();
  const state = supabase ? await getSupabaseDrawState(monthKey) : getStoredDrawState(monthKey);
  const nextRolloverCents = supabase ? await getSupabaseRolloverCents(monthKey) : getStoredRolloverCents();

  if (!state) {
    return {
      state: null,
      nextRolloverCents,
      winners: { fiveMatch: 0, fourMatch: 0, threeMatch: 0 },
    };
  }

  return {
    state,
    nextRolloverCents,
    winners: {
      fiveMatch: state.entries.filter((entry) => entry.matchCount === 5).length,
      fourMatch: state.entries.filter((entry) => entry.matchCount === 4).length,
      threeMatch: state.entries.filter((entry) => entry.matchCount === 3).length,
    },
  };
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDrawTitle(monthKey: string) {
  return `Draw — ${getDrawLabel(monthKey)}`;
}
