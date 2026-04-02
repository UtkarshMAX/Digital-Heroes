import { getCurrentMonthKey, getStoredDrawState, type DrawEntryRecord } from './draws';
import { supabase } from '../lib/supabase';
import { sendNotification } from './notifications';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type PayoutStatus = 'pending' | 'paid';

export type WinnerClaimRecord = {
  id: string;
  drawEntryId: string;
  monthKey: string;
  userId: string;
  displayName: string;
  matchCount: number;
  prizeCents: number;
  charityCents: number;
  proofPath: string | null;
  reviewStatus: ReviewStatus;
  payoutStatus: PayoutStatus;
  adminNotes: string;
  submittedAt: string | null;
  reviewedAt: string | null;
};

const DEMO_CLAIMS_KEY = 'impact-golf-demo-winner-claims';

function readClaims() {
  const raw = window.localStorage.getItem(DEMO_CLAIMS_KEY);
  if (!raw) {
    return [] as WinnerClaimRecord[];
  }

  try {
    const parsed = JSON.parse(raw) as WinnerClaimRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClaims(claims: WinnerClaimRecord[]) {
  window.localStorage.setItem(DEMO_CLAIMS_KEY, JSON.stringify(claims));
}

function upsertClaim(nextClaim: WinnerClaimRecord) {
  const claims = readClaims();
  const next = claims.filter((claim) => claim.id !== nextClaim.id);
  next.push(nextClaim);
  writeClaims(next);
}

function buildDemoClaimFromEntry(monthKey: string, entry: DrawEntryRecord) {
  return {
    id: `claim-${monthKey}-${entry.userId}`,
    drawEntryId: entry.id ?? `draw-entry-${monthKey}-${entry.userId}`,
    monthKey,
    userId: entry.userId,
    displayName: entry.displayName,
    matchCount: entry.matchCount,
    prizeCents: entry.prizeCents,
    charityCents: entry.charityCents,
    proofPath: null,
    reviewStatus: 'pending' as const,
    payoutStatus: 'pending' as const,
    adminNotes: '',
    submittedAt: null,
    reviewedAt: null,
  };
}

function buildEligibleClaims(monthKey: string) {
  const draw = getStoredDrawState(monthKey);
  if (!draw || draw.status !== 'published') {
    return [] as WinnerClaimRecord[];
  }

  const storedClaims = readClaims().filter((claim) => claim.monthKey === monthKey);

  return draw.entries
    .filter((entry) => entry.matchCount >= 3)
    .map((entry) => {
      const existing = storedClaims.find((claim) => claim.userId === entry.userId);
      return existing ?? buildDemoClaimFromEntry(monthKey, entry);
    });
}

async function listSupabaseWinnerClaims(monthKey: string) {
  if (!supabase) {
    return [] as WinnerClaimRecord[];
  }

  const { data: drawRuns } = await supabase
    .from('draw_runs')
    .select('id, month_key')
    .eq('month_key', monthKey)
    .eq('status', 'published')
    .maybeSingle();

  if (!drawRuns) {
    return [] as WinnerClaimRecord[];
  }

  const { data: drawEntries } = await supabase
    .from('draw_entries')
    .select('id, user_id, match_count, prize_cents, charity_cents')
    .eq('draw_run_id', drawRuns.id)
    .gte('match_count', 3);

  if (!drawEntries || drawEntries.length === 0) {
    return [] as WinnerClaimRecord[];
  }

  const userIds = [...new Set(drawEntries.map((entry) => entry.user_id))];
  const entryIds = drawEntries.map((entry) => entry.id);

  const [{ data: profiles }, { data: claims }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', userIds),
    supabase.from('winner_claims').select('id, draw_entry_id, user_id, proof_file_path, review_status, payout_status, admin_notes, created_at, reviewed_at').in('draw_entry_id', entryIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const claimMap = new Map((claims ?? []).map((claim) => [claim.draw_entry_id, claim]));

  return drawEntries.map((entry) => {
    const claim = claimMap.get(entry.id);
    return {
      id: claim?.id ?? `claim-${drawRuns.month_key}-${entry.user_id}`,
      drawEntryId: entry.id,
      monthKey: drawRuns.month_key,
      userId: entry.user_id,
      displayName: profileMap.get(entry.user_id) ?? 'Member',
      matchCount: entry.match_count,
      prizeCents: entry.prize_cents,
      charityCents: entry.charity_cents,
      proofPath: claim?.proof_file_path ?? null,
      reviewStatus: claim?.review_status ?? 'pending',
      payoutStatus: claim?.payout_status ?? 'pending',
      adminNotes: claim?.admin_notes ?? '',
      submittedAt: claim?.created_at ?? null,
      reviewedAt: claim?.reviewed_at ?? null,
    };
  });
}

export async function getUserWinnerClaim(userId: string) {
  const monthKey = getCurrentMonthKey();

  if (supabase) {
    const claims = await listSupabaseWinnerClaims(monthKey);
    return claims.find((item) => item.userId === userId) ?? null;
  }

  const claim = buildEligibleClaims(monthKey).find((item) => item.userId === userId) ?? null;
  if (claim) {
    upsertClaim(claim);
  }
  return claim;
}

export async function submitWinnerProof(userId: string, proofPath: string) {
  const claim = await getUserWinnerClaim(userId);
  if (!claim) {
    return { ok: false as const, message: 'You do not have a claimable prize for the current draw.' };
  }

  if (supabase) {
    const { data: existing } = await supabase
      .from('winner_claims')
      .select('id')
      .eq('draw_entry_id', claim.drawEntryId)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('winner_claims')
        .update({
          proof_file_path: proofPath.trim(),
          review_status: 'pending',
          payout_status: 'pending',
          admin_notes: '',
          reviewed_at: null,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('winner_claims').insert({
        draw_entry_id: claim.drawEntryId,
        user_id: claim.userId,
        proof_file_path: proofPath.trim(),
        review_status: 'pending',
        payout_status: 'pending',
      });
    }

    const updated = await getUserWinnerClaim(userId);
    void sendNotification({ kind: 'winner-proof-submitted', claimId: updated?.id }).catch(() => undefined);
    return { ok: true as const, claim: updated! };
  }

  const nextClaim: WinnerClaimRecord = {
    ...claim,
    proofPath: proofPath.trim(),
    reviewStatus: 'pending',
    payoutStatus: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  };

  upsertClaim(nextClaim);
  void sendNotification({ kind: 'winner-proof-submitted', claimId: nextClaim.id }).catch(() => undefined);
  return { ok: true as const, claim: nextClaim };
}

export async function listWinnerClaimsForAdmin() {
  const monthKey = getCurrentMonthKey();

  if (supabase) {
    const claims = await listSupabaseWinnerClaims(monthKey);
    return claims.sort((a, b) => b.matchCount - a.matchCount || b.prizeCents - a.prizeCents);
  }

  const claims = buildEligibleClaims(monthKey);
  claims.forEach(upsertClaim);
  return claims.sort((a, b) => b.matchCount - a.matchCount || b.prizeCents - a.prizeCents);
}

export async function reviewWinnerClaim(
  claimId: string,
  reviewStatus: ReviewStatus,
  adminNotes: string,
) {
  if (supabase) {
    const { data } = await supabase
      .from('winner_claims')
      .update({
        review_status: reviewStatus,
        payout_status: reviewStatus === 'approved' ? 'pending' : 'pending',
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .select('id')
      .maybeSingle();

    if (!data) {
      return null;
    }

    const claims = await listWinnerClaimsForAdmin();
    const updatedClaim = claims.find((claim) => claim.id === claimId) ?? null;
    if (updatedClaim) {
      void sendNotification({ kind: 'claim-reviewed', claimId: updatedClaim.id }).catch(() => undefined);
    }
    return updatedClaim;
  }

  const claims = readClaims();
  const claim = claims.find((item) => item.id === claimId);
  if (!claim) {
    return null;
  }

  const nextClaim: WinnerClaimRecord = {
    ...claim,
    reviewStatus,
    payoutStatus: 'pending',
    adminNotes,
    reviewedAt: new Date().toISOString(),
  };

  upsertClaim(nextClaim);
  void sendNotification({ kind: 'claim-reviewed', claimId: nextClaim.id }).catch(() => undefined);
  return nextClaim;
}

export async function markWinnerPaid(claimId: string) {
  if (supabase) {
    const { data } = await supabase
      .from('winner_claims')
      .update({
        payout_status: 'paid',
      })
      .eq('id', claimId)
      .eq('review_status', 'approved')
      .select('id')
      .maybeSingle();

    if (!data) {
      return null;
    }

    const claims = await listWinnerClaimsForAdmin();
    const updatedClaim = claims.find((claim) => claim.id === claimId) ?? null;
    if (updatedClaim) {
      void sendNotification({ kind: 'payout-paid', claimId: updatedClaim.id }).catch(() => undefined);
    }
    return updatedClaim;
  }

  const claims = readClaims();
  const claim = claims.find((item) => item.id === claimId);
  if (!claim || claim.reviewStatus !== 'approved') {
    return null;
  }

  const nextClaim: WinnerClaimRecord = {
    ...claim,
    payoutStatus: 'paid',
  };

  upsertClaim(nextClaim);
  void sendNotification({ kind: 'payout-paid', claimId: nextClaim.id }).catch(() => undefined);
  return nextClaim;
}
