import React from 'react';
import { Link } from 'react-router';
import { HeartHandshake, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export function HowItWorks() {
  const steps = [
    {
      title: 'Join a membership plan',
      body: 'Visitors choose monthly or yearly access, then activate membership through the subscription flow.',
    },
    {
      title: 'Record the latest five Stableford rounds',
      body: 'Members keep their active score pool fresh. The latest 5 scores feed into the monthly draw system.',
    },
    {
      title: 'Choose a charity and contribution percentage',
      body: 'Every member selects a cause and keeps at least 10% of impact directed there.',
    },
    {
      title: 'Wait for the monthly draw',
      body: 'Admins can simulate results first, then officially publish the winning sequence for the month.',
    },
    {
      title: 'Verify winners and track payouts',
      body: 'Winning members submit proof, admins review claims, and payout state moves from pending to paid.',
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f9faf7_0%,#ffffff_100%)]">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-secondary shadow-sm">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-primary">Impact Golf</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">How It Works</p>
            </div>
          </Link>
          <Button asChild>
            <Link to="/signup">Join Now</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Visitor Guide</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-foreground">A charity-first golf platform explained in five moves.</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            The platform is designed to be emotionally engaging and operationally clear: subscribe, log scores, fund impact, publish draws, and verify payouts.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {steps.map((step, index) => (
            <Card key={step.title} className="border-border/60 bg-card shadow-sm">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-secondary text-xl font-black shadow-inner">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">{step.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-[28px] border border-border/60 bg-primary p-8 text-primary-foreground shadow-sm">
          <h2 className="text-3xl font-bold text-secondary">Ready to try it?</h2>
          <p className="mt-3 max-w-2xl text-primary-foreground/80 leading-7">
            Create an account, choose your charity, and move into the subscription flow to activate your first monthly draw cycle.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="text-primary" asChild>
              <Link to="/signup">
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20" asChild>
              <Link to="/charities">Browse Charities</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
