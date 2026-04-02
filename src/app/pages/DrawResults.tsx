import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Trophy, Star, CheckCircle, Ticket, History, Heart, Sparkles, Clock3 } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useAuth } from '../providers/AuthProvider';
import { formatDrawTitle, formatMoney, getCurrentDrawLabel, getUserDrawView } from '../data/draws';
import { getUserWinnerClaim, submitWinnerProof, type WinnerClaimRecord } from '../data/claims';

export function DrawResults() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(true);
  const [winningNumbers, setWinningNumbers] = React.useState<number[]>([]);
  const [userScores, setUserScores] = React.useState<number[]>([]);
  const [matches, setMatches] = React.useState(0);
  const [prizeCents, setPrizeCents] = React.useState(0);
  const [charityCents, setCharityCents] = React.useState(0);
  const [drawLabel, setDrawLabel] = React.useState(getCurrentDrawLabel());
  const [nextRolloverCents, setNextRolloverCents] = React.useState(0);
  const [proofPath, setProofPath] = React.useState('');
  const [claim, setClaim] = React.useState<WinnerClaimRecord | null>(null);
  const [claimMessage, setClaimMessage] = React.useState('');
  const [submittingProof, setSubmittingProof] = React.useState(false);
  const [tierPayouts, setTierPayouts] = React.useState([
    { title: '5 Matches', prize: '$0', desc: 'Jackpot Prize', icon: Star, color: 'text-secondary' },
    { title: '4 Matches', prize: '$0', desc: 'Tier 2 Prize', icon: CheckCircle, color: 'text-emerald-500' },
    { title: '3 Matches', prize: '$0', desc: 'Tier 3 Prize', icon: Ticket, color: 'text-blue-500' },
  ]);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    Promise.all([getUserDrawView(user.id), getUserWinnerClaim(user.id)]).then(([view, winnerClaim]) => {
      if (!active) {
        return;
      }

      setPending(view.pending);
      setNextRolloverCents(view.nextRolloverCents);

      if (view.state) {
        setDrawLabel(formatDrawTitle(view.state.monthKey));
        setTierPayouts([
          { title: '5 Matches', prize: formatMoney(view.state.jackpotPoolCents), desc: 'Jackpot Prize', icon: Star, color: 'text-secondary' },
          { title: '4 Matches', prize: formatMoney(view.state.tier4PoolCents), desc: 'Tier 2 Prize', icon: CheckCircle, color: 'text-emerald-500' },
          { title: '3 Matches', prize: formatMoney(view.state.tier3PoolCents), desc: 'Tier 3 Prize', icon: Ticket, color: 'text-blue-500' },
        ]);
      }

      if (view.userEntry && view.state) {
        setWinningNumbers(view.state.winningNumbers);
        setUserScores(view.userEntry.scoreSnapshot);
        setMatches(view.userEntry.matchCount);
        setPrizeCents(view.userEntry.prizeCents);
        setCharityCents(view.userEntry.charityCents);
      } else {
        setWinningNumbers([]);
        setUserScores([]);
        setMatches(0);
        setPrizeCents(0);
        setCharityCents(0);
      }

      setClaim(winnerClaim);
      setProofPath(winnerClaim?.proofPath ?? '');

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  React.useEffect(() => {
    if (pending || matches < 3) {
      return;
    }

    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#0F5132', '#D4AF37'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#0F5132', '#D4AF37'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [matches, pending]);

  const resultMessage =
    matches >= 5 ? 'Jackpot! Phenomenal.' :
    matches === 4 ? 'Exceptional! You secured a Tier 2 prize.' :
    matches === 3 ? 'Great job! You secured a Tier 3 prize.' :
    'Keep tracking your performance. Every score counts!';

  async function handleProofSubmit() {
    if (!user || !proofPath.trim()) {
      return;
    }

    setSubmittingProof(true);
    const result = await submitWinnerProof(user.id, proofPath);
    if (result.ok) {
      setClaim(result.claim);
      setClaimMessage('Proof submitted successfully. Admin review is now pending.');
    } else {
      setClaimMessage(result.message);
    }
    setSubmittingProof(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Ticket className="w-8 h-8 text-primary" />
            Impact Draws
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            See if your performance unlocked additional charitable impact and prizes.
          </p>
        </div>
        <Button variant="outline" className="shadow-sm" disabled>
          <History className="w-4 h-4 mr-2" />
          Past Results
        </Button>
      </div>

      {loading ? (
        <Card className="shadow-lg border-border/50">
          <CardContent className="p-10 text-center text-muted-foreground">
            Loading draw results...
          </CardContent>
        </Card>
      ) : pending ? (
        <Card className="shadow-lg border-border/50 overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Clock3 className="w-7 h-7 text-secondary" />
              Results Pending Publication
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              {drawLabel} has not been officially published by the admin yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-5">
            <p className="text-muted-foreground leading-relaxed">
              Once the monthly draw is published, this page will reveal the winning sequence, your match count, and any prize or charity payout tied to your entry.
            </p>
            <div className="rounded-xl border border-border bg-muted/20 p-5">
              <p className="text-sm font-medium text-foreground">Next jackpot rollover reserve</p>
              <p className="mt-2 text-3xl font-bold text-primary">{formatMoney(nextRolloverCents)}</p>
              <p className="mt-2 text-sm text-muted-foreground">If nobody hits 5 matches, this amount carries into the next month.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-t-4 border-t-secondary shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="bg-primary relative z-10 text-primary-foreground p-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-sm font-medium tracking-wide">
              <Sparkles className="w-4 h-4 text-secondary" />
              {drawLabel}
            </div>

            <h3 className="text-3xl font-bold text-secondary">Winning Sequence</h3>

            <div className="flex justify-center gap-3 sm:gap-5 py-2">
              {winningNumbers.map((num, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 + i * 0.1 }}
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-secondary text-primary flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-xl border-b-4 border-black/20"
                >
                  {num}
                </motion.div>
              ))}
            </div>
          </div>

          <CardContent className="p-8 sm:p-10 relative z-10 bg-card">
            <div className="text-center space-y-8">
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Your Active Performance Pool</h4>
                <div className="flex justify-center gap-3 sm:gap-5">
                  {userScores.map((num, i) => {
                    const isMatch = winningNumbers.includes(num);
                    return (
                      <motion.div
                        key={i}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all relative overflow-hidden ${
                          isMatch ? 'bg-primary border-primary text-secondary shadow-md scale-110 z-10' : 'bg-muted/50 border-border text-muted-foreground'
                        }`}
                      >
                        {isMatch ? <div className="absolute inset-0 bg-white/10 animate-pulse"></div> : null}
                        <span className="relative z-10">{num}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-8 p-8 bg-muted/30 rounded-2xl border border-border shadow-sm max-w-lg mx-auto relative overflow-hidden"
              >
                {matches >= 3 ? <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary"></div> : null}

                <div className="flex items-center justify-center gap-3 mb-3">
                  <Trophy className={`w-8 h-8 ${matches >= 3 ? 'text-secondary drop-shadow-md' : 'text-muted-foreground'}`} />
                </div>
                <h3 className="text-3xl font-bold mb-2 text-foreground">
                  {matches} Match{matches !== 1 ? 'es' : ''}!
                </h3>

                <div className="space-y-4 mt-4">
                  <p className="text-lg font-medium text-muted-foreground">{resultMessage}</p>

                  {prizeCents > 0 ? (
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <Heart className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-primary">
                          Prize won: {formatMoney(prizeCents)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Charity share from this win: {formatMoney(charityCents)}
                      </p>

                      {claim ? (
                        <div className="rounded-xl border border-border bg-background/80 p-4 text-left space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-muted px-3 py-1 text-foreground">Review: {claim.reviewStatus}</span>
                            <span className="rounded-full bg-muted px-3 py-1 text-foreground">Payout: {claim.payoutStatus}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Upload your score proof link or file path so the admin can verify your win.
                          </p>
                          <input
                            value={proofPath}
                            onChange={(event) => setProofPath(event.target.value)}
                            placeholder="Paste screenshot path or proof URL"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <Button type="button" onClick={handleProofSubmit} disabled={submittingProof || proofPath.trim().length === 0}>
                            {submittingProof ? 'Submitting Proof...' : claim.proofPath ? 'Update Proof Submission' : 'Submit Winner Proof'}
                          </Button>
                          {claim.proofPath ? (
                            <p className="text-xs text-muted-foreground">Current proof: {claim.proofPath}</p>
                          ) : null}
                          {claim.adminNotes ? (
                            <p className="text-xs text-muted-foreground">Admin note: {claim.adminNotes}</p>
                          ) : null}
                          {claimMessage ? (
                            <p className="text-xs text-primary">{claimMessage}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tierPayouts.map((tier, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + idx * 0.1 }}
          >
            <Card className="shadow-sm border-border/50 h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <tier.icon className={`w-5 h-5 ${tier.color}`} /> {tier.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-foreground">{tier.prize}</div>
                <p className="text-sm font-medium text-muted-foreground mt-1">{tier.desc}</p>
                <div className="mt-4 text-xs text-primary font-semibold bg-primary/10 px-2 py-1 rounded inline-block">
                  Split equally among winners in this tier
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
