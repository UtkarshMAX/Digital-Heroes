import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity,
  CheckCircle2,
  DollarSign,
  Heart,
  PlusCircle,
  RefreshCw,
  Send,
  Settings,
  Trophy,
  Users,
  Wallet,
  WandSparkles,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../providers/AuthProvider';
import {
  formatDrawTitle,
  formatMoney,
  getCurrentDrawLabel,
  publishMonthlyDraw,
  simulateMonthlyDraw,
  type DrawMode,
} from '../data/draws';
import { listWinnerClaimsForAdmin, markWinnerPaid, reviewWinnerClaim, type WinnerClaimRecord } from '../data/claims';
import {
  getAdminDashboardSnapshot,
  saveAdminCharity,
  toggleAdminCharityState,
  type AdminAnalytics,
  type AdminCharityInput,
  type AdminCharityRecord,
  type AdminMemberRecord,
} from '../data/admin';

const emptyCharityForm: AdminCharityInput = {
  name: '',
  slug: '',
  category: '',
  shortDescription: '',
  featured: false,
  isActive: true,
};

export function AdminDashboard() {
  const { user } = useAuth();
  const [mode, setMode] = React.useState<DrawMode>('random');
  const [loading, setLoading] = React.useState(true);
  const [busyAction, setBusyAction] = React.useState<'simulate' | 'publish' | null>(null);
  const [members, setMembers] = React.useState<AdminMemberRecord[]>([]);
  const [charities, setCharities] = React.useState<AdminCharityRecord[]>([]);
  const [analytics, setAnalytics] = React.useState<AdminAnalytics | null>(null);
  const [summary, setSummary] = React.useState<Awaited<ReturnType<typeof getAdminDashboardSnapshot>>['drawSummary'] | null>(null);
  const [claims, setClaims] = React.useState<WinnerClaimRecord[]>([]);
  const [claimNotes, setClaimNotes] = React.useState<Record<string, string>>({});
  const [charityForm, setCharityForm] = React.useState<AdminCharityInput>(emptyCharityForm);
  const [charityBusy, setCharityBusy] = React.useState(false);

  async function refreshDashboard() {
    if (!user) {
      return;
    }

    setLoading(true);
    const [snapshot, nextClaims] = await Promise.all([
      getAdminDashboardSnapshot(user.id),
      listWinnerClaimsForAdmin(),
    ]);

    setMembers(snapshot.members);
    setCharities(snapshot.charities);
    setAnalytics(snapshot.analytics);
    setSummary(snapshot.drawSummary);
    setClaims(nextClaims);
    setLoading(false);
  }

  React.useEffect(() => {
    refreshDashboard();
  }, [user]);

  async function handleSimulate() {
    if (!user) {
      return;
    }

    setBusyAction('simulate');
    await simulateMonthlyDraw(user.id, mode);
    await refreshDashboard();
    setBusyAction(null);
  }

  async function handlePublish() {
    if (!user) {
      return;
    }

    setBusyAction('publish');
    await publishMonthlyDraw(user.id, mode);
    await refreshDashboard();
    setBusyAction(null);
  }

  async function handleClaimReview(claimId: string, status: 'approved' | 'rejected') {
    const updated = await reviewWinnerClaim(claimId, status, claimNotes[claimId] ?? '');
    if (!updated) {
      return;
    }

    await refreshDashboard();
  }

  async function handleMarkPaid(claimId: string) {
    await markWinnerPaid(claimId);
    await refreshDashboard();
  }

  function editCharity(charity: AdminCharityRecord) {
    setCharityForm({
      id: charity.id,
      name: charity.name,
      slug: charity.slug,
      category: charity.category,
      shortDescription: charity.shortDescription,
      featured: charity.featured,
      isActive: charity.isActive,
    });
  }

  async function handleCharitySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCharityBusy(true);
    await saveAdminCharity(charityForm);
    setCharityForm(emptyCharityForm);
    await refreshDashboard();
    setCharityBusy(false);
  }

  async function handleCharityToggle(charityId: string, isActive: boolean) {
    await toggleAdminCharityState(charityId, !isActive);
    await refreshDashboard();
  }

  const currentState = summary?.state ?? null;
  const currentLabel = currentState ? formatDrawTitle(currentState.monthKey) : getCurrentDrawLabel();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-4 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Platform Admin</h2>
          <p className="mt-2 text-lg text-muted-foreground">Manage members, charities, draws, and winner verification from one control room.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={mode === 'random' ? 'default' : 'outline'} className="shadow-sm" onClick={() => setMode('random')}>
            <WandSparkles className="mr-2 h-4 w-4" /> Random Mode
          </Button>
          <Button variant={mode === 'weighted' ? 'default' : 'outline'} className="shadow-sm" onClick={() => setMode('weighted')}>
            <Activity className="mr-2 h-4 w-4" /> Weighted Mode
          </Button>
          <Button className="bg-secondary font-bold text-primary hover:bg-secondary/90 shadow-md" onClick={handleSimulate} disabled={busyAction !== null}>
            <RefreshCw className="mr-2 h-4 w-4" /> {busyAction === 'simulate' ? 'Simulating...' : 'Run Simulation'}
          </Button>
          <Button className="font-bold shadow-md" onClick={handlePublish} disabled={busyAction !== null}>
            <Send className="mr-2 h-4 w-4" /> {busyAction === 'publish' ? 'Publishing...' : 'Publish Results'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="bg-muted/20 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
              Current Draw
              <div className="rounded-lg bg-primary/10 p-2">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-xl font-bold text-foreground">{currentLabel}</div>
            <p className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {currentState ? currentState.status.toUpperCase() : 'NOT STARTED'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary shadow-sm">
          <CardHeader className="bg-muted/20 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
              Active Members
              <div className="rounded-lg bg-secondary/20 p-2">
                <Users className="h-4 w-4 text-secondary" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-primary">{analytics?.activeMembers ?? 0}</div>
            <p className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {analytics?.totalMembers ?? 0} total accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="bg-muted/20 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
              Pending Claims
              <div className="rounded-lg bg-rose-100 p-2">
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-foreground">{analytics?.pendingClaims ?? 0}</div>
            <p className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Review queue this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="bg-muted/20 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
              Live Charities
              <div className="rounded-lg bg-emerald-100 p-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-foreground">{analytics?.totalCharities ?? 0}</div>
            <p className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
              {analytics?.featuredCharities ?? 0} featured causes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/10">
              <CardTitle className="text-lg">Membership Analytics</CardTitle>
              <CardDescription>Real admin reporting based on member accounts and subscription activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.growth ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="members" name="New Members" fill="#0F5132" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="activeSubscriptions" name="Active Subscriptions" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">5-Match Winners</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{summary?.winners.fiveMatch ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">4-Match Winners</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{summary?.winners.fourMatch ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3-Match Winners</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{summary?.winners.threeMatch ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/10">
              <CardTitle className="text-lg">Draw Control Room</CardTitle>
              <CardDescription>Simulation preview and official publishing controls for the current month.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading draw controls...</p>
              ) : currentState ? (
                <>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode</p>
                    <p className="mt-2 text-lg font-bold text-foreground">{currentState.mode === 'weighted' ? 'Weighted Algorithm' : 'Random Lottery'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Winning Numbers</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentState.winningNumbers.map((num) => (
                        <span key={num} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-secondary">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm font-medium text-foreground">Tier Pools</p>
                    <p className="text-sm text-muted-foreground">5-match: {formatMoney(currentState.jackpotPoolCents)}</p>
                    <p className="text-sm text-muted-foreground">4-match: {formatMoney(currentState.tier4PoolCents)}</p>
                    <p className="text-sm text-muted-foreground">3-match: {formatMoney(currentState.tier3PoolCents)}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No draw has been simulated yet for this month.</p>
              )}

              <Button className="h-12 w-full justify-start shadow-sm" variant="outline" onClick={handleSimulate} disabled={busyAction !== null}>
                <RefreshCw className="mr-3 h-5 w-5 text-secondary" />
                <span className="font-medium text-foreground">{busyAction === 'simulate' ? 'Running simulation...' : 'Simulate This Month'}</span>
              </Button>
              <Button className="h-12 w-full justify-start shadow-sm" variant="outline" onClick={handlePublish} disabled={busyAction !== null}>
                <Send className="mr-3 h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">{busyAction === 'publish' ? 'Publishing now...' : 'Publish Official Results'}</span>
              </Button>
              <Button className="h-12 w-full justify-start shadow-sm" variant="outline" disabled>
                <Settings className="mr-3 h-5 w-5 text-blue-500" />
                <span className="font-medium text-foreground">Draw Settings</span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg">Member Directory</CardTitle>
            <CardDescription>Live member records with role, subscription plan, and renewal visibility.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Member</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Subscription</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Renewal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {members.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-muted-foreground" colSpan={5}>No member records yet.</td>
                    </tr>
                  ) : members.map((member) => (
                    <tr key={member.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{member.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${member.role === 'admin' ? 'bg-primary text-primary-foreground' : 'border border-border/50 bg-muted text-muted-foreground'}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground font-medium">{member.plan}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide ${
                          member.status === 'Active' || member.status === 'Trialing'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : member.status === 'Past Due'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-border/50 bg-muted text-muted-foreground'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            member.status === 'Active' || member.status === 'Trialing'
                              ? 'bg-emerald-500'
                              : member.status === 'Past Due'
                                ? 'bg-amber-500'
                                : 'bg-muted-foreground'
                          }`} />
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {member.renewalAt ? new Date(member.renewalAt).toLocaleDateString() : 'No renewal'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg">Charity Management</CardTitle>
            <CardDescription>Create or update charity records and control which causes are live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <form className="space-y-4" onSubmit={handleCharitySubmit}>
              <div className="space-y-2">
                <Label htmlFor="charity-name">Charity Name</Label>
                <Input
                  id="charity-name"
                  value={charityForm.name}
                  onChange={(event) => setCharityForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="charity-slug">Slug</Label>
                  <Input
                    id="charity-slug"
                    value={charityForm.slug}
                    onChange={(event) => setCharityForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="charity-category">Category</Label>
                  <Input
                    id="charity-category"
                    value={charityForm.category}
                    onChange={(event) => setCharityForm((prev) => ({ ...prev, category: event.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="charity-description">Short Description</Label>
                <textarea
                  id="charity-description"
                  value={charityForm.shortDescription}
                  onChange={(event) => setCharityForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={charityForm.featured}
                    onChange={(event) => setCharityForm((prev) => ({ ...prev, featured: event.target.checked }))}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={charityForm.isActive}
                    onChange={(event) => setCharityForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Active
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={charityBusy}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {charityBusy ? 'Saving...' : charityForm.id ? 'Update Charity' : 'Create Charity'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCharityForm(emptyCharityForm)}>
                  Reset
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              {charities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No charity records available yet.</p>
              ) : charities.map((charity) => (
                <div key={charity.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-foreground">{charity.name}</p>
                        {charity.featured ? (
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">Featured</span>
                        ) : null}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${charity.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                          {charity.isActive ? 'Live' : 'Hidden'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">{charity.category}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{charity.shortDescription}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editCharity(charity)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => handleCharityToggle(charity.id, charity.isActive)}>
                        {charity.isActive ? 'Hide' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/10">
          <CardTitle className="text-lg">Winner Verification</CardTitle>
          <CardDescription>Review proof submissions, approve or reject claims, and track payout completion.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Winner</th>
                  <th className="px-6 py-4 font-semibold">Match Tier</th>
                  <th className="px-6 py-4 font-semibold">Prize</th>
                  <th className="px-6 py-4 font-semibold">Proof</th>
                  <th className="px-6 py-4 font-semibold">Review</th>
                  <th className="px-6 py-4 font-semibold">Payout</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {claims.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={7}>No claimable winners yet for the current published draw.</td>
                  </tr>
                ) : claims.map((claim) => (
                  <tr key={claim.id} className="align-top transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{claim.displayName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{claim.userId}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{claim.matchCount} matches</td>
                    <td className="px-6 py-4 font-medium text-foreground">{formatMoney(claim.prizeCents)}</td>
                    <td className="px-6 py-4">
                      {claim.proofPath ? (
                        <div className="space-y-1">
                          <div className="break-all text-foreground">{claim.proofPath}</div>
                          <div className="text-xs text-muted-foreground">
                            Submitted {claim.submittedAt ? new Date(claim.submittedAt).toLocaleString() : 'just now'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Awaiting upload</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                          {claim.reviewStatus}
                        </span>
                        <textarea
                          value={claimNotes[claim.id] ?? claim.adminNotes}
                          onChange={(event) => setClaimNotes((prev) => ({ ...prev, [claim.id]: event.target.value }))}
                          placeholder="Admin notes"
                          className="min-w-40 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                        {claim.payoutStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleClaimReview(claim.id, 'approved')} disabled={!claim.proofPath}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleClaimReview(claim.id, 'rejected')}>
                          <XCircle className="mr-2 h-4 w-4 text-destructive" />
                          Reject
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(claim.id)} disabled={claim.reviewStatus !== 'approved' || claim.payoutStatus === 'paid'}>
                          <Wallet className="mr-2 h-4 w-4 text-primary" />
                          Mark Paid
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
